use crate::db::DbPool;
use axum::{
    extract::{Path, Request, State},
    middleware::{self, Next},
    response::Response,
    routing::get,
    Json, Router,
};
use std::net::SocketAddr;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone)]
struct ServerState {
    pool: DbPool,
    token: Arc<String>,
}

/// Auth middleware — rejects requests without a valid Bearer token.
async fn require_token(
    State(state): State<ServerState>,
    req: Request,
    next: Next,
) -> Result<Response, axum::http::StatusCode> {
    let header = req
        .headers()
        .get("authorization")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    if header == format!("Bearer {}", state.token.as_str()) {
        Ok(next.run(req).await)
    } else {
        Err(axum::http::StatusCode::UNAUTHORIZED)
    }
}

pub fn start_server(pool: DbPool) -> String {
    let token = Uuid::new_v4().to_string();
    let token_for_caller = token.clone();

    let state = ServerState {
        pool,
        token: Arc::new(token),
    };

    tauri::async_runtime::spawn(async move {
        let app = Router::new()
            .route("/v1/prompts/{id}", get(get_latest_prompt))
            .route_layer(middleware::from_fn_with_state(state.clone(), require_token))
            .with_state(state);

        let addr = SocketAddr::from(([127, 0, 0, 1], 31337));
        println!("Local Prompt-as-a-Service listening on {addr}");
        match tokio::net::TcpListener::bind(&addr).await {
            Ok(listener) => {
                if let Err(e) = axum::serve(listener, app).await {
                    eprintln!("API server error: {e}");
                }
            }
            Err(e) => {
                eprintln!("Failed to bind to port 31337: {e}");
            }
        }
    });

    token_for_caller
}

async fn get_latest_prompt(
    State(state): State<ServerState>,
    Path(id): Path<String>,
) -> Result<Json<serde_json::Value>, axum::http::StatusCode> {
    let pool_clone = state.pool.clone();

    tokio::task::spawn_blocking(move || {
        let conn = pool_clone.lock();

        let prompt_exists: i64 = conn
            .query_row(
                "SELECT count(*) FROM prompts WHERE id = ?1",
                rusqlite::params![&id],
                |row| row.get(0),
            )
            .unwrap_or(0);

        if prompt_exists == 0 {
            return Err(axum::http::StatusCode::NOT_FOUND);
        }

        let row: std::result::Result<
            (String, Option<String>, Option<String>, String),
            rusqlite::Error,
        > = conn.query_row(
            "SELECT content, system_prompt, model, params
             FROM revisions
             WHERE prompt_id = ?1
             ORDER BY revision_number DESC LIMIT 1",
            rusqlite::params![&id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
        );

        match row {
            Ok((content, system_prompt, model, params_str)) => {
                let params: serde_json::Value =
                    serde_json::from_str(&params_str).unwrap_or_else(|_| serde_json::json!({}));
                let response = serde_json::json!({
                    "prompt_id": id,
                    "content": content,
                    "system_prompt": system_prompt,
                    "model": model,
                    "params": params
                });
                Ok(Json(response))
            }
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
