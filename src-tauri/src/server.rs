use crate::db::DbPool;
use crate::error::AppError;
use axum::{
    extract::{Path, State},
    routing::get,
    Json, Router,
};
use std::net::SocketAddr;
use std::sync::Arc;

pub fn start_server(pool: DbPool) {
    tauri::async_runtime::spawn(async move {
        // Build our application with a route
        let app = Router::new()
            .route("/v1/prompts/{id}", get(get_latest_prompt))
            .with_state(pool);

        // Run it
        let addr = SocketAddr::from(([127, 0, 0, 1], 31337));
        println!("Local Prompt-as-a-Service listening on {}", addr);
        match tokio::net::TcpListener::bind(&addr).await {
            Ok(listener) => {
                if let Err(e) = axum::serve(listener, app).await {
                    eprintln!("API server error: {}", e);
                }
            }
            Err(e) => {
                eprintln!("Failed to bind to port 31337: {}", e);
            }
        }
    });
}

async fn get_latest_prompt(
    State(pool): State<DbPool>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, axum::http::StatusCode> {
    // Note: Because DbPool uses a synchronous Mutex, we should use spawn_blocking or quickly access it.
    // For local dev with minimal contention, brief lock is okay, but spawn_blocking is safer in async over rusqlite.
    let pool_clone = pool.clone();

    tokio::task::spawn_blocking(move || {
        let conn = pool_clone.lock();
        
        let prompt_exists: i64 = conn.query_row(
            "SELECT count(*) FROM prompts WHERE id = ?1",
            rusqlite::params![&id],
            |row| row.get(0)
        ).unwrap_or(0);

        if prompt_exists == 0 {
            return Err(axum::http::StatusCode::NOT_FOUND);
        }

        let row: std::result::Result<(String, Option<String>, Option<String>, String), rusqlite::Error> = conn.query_row(
            "SELECT content, system_prompt, model, params
             FROM revisions
             WHERE prompt_id = ?1
             ORDER BY revision_number DESC LIMIT 1",
            rusqlite::params![&id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
        );

        match row {
            Ok((content, system_prompt, model, params_str)) => {
                let params: serde_json::Value = serde_json::from_str(&params_str).unwrap_or_else(|_| serde_json::json!({}));
                let response = serde_json::json!({
                    "prompt_id": id,
                    "content": content,
                    "system_prompt": system_prompt,
                    "model": model,
                    "params": params
                });
                Ok(Json(response))
            }
            // Prompt exists but has no revisions yet
            Err(_) => {
                let response = serde_json::json!({
                    "prompt_id": id,
                    "content": "",
                    "system_prompt": null,
                    "model": null,
                    "params": {}
                });
                Ok(Json(response))
            }
        }
    })
    .await
    .map_err(|_| axum::http::StatusCode::INTERNAL_SERVER_ERROR)?
}
