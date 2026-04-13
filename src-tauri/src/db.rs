use crate::error::{AppError, AppResult};
use chrono::Utc;
use parking_lot::Mutex;
use rusqlite::{params, Connection};
use std::path::Path;
use std::sync::Arc;
use uuid::Uuid;

pub type DbPool = Arc<Mutex<Connection>>;

const MIGRATIONS: &[&str] = &[
    include_str!("../migrations/001_initial.sql"),
    include_str!("../migrations/002_outputs.sql"),
    include_str!("../migrations/003_tags.sql"),
    include_str!("../migrations/004_prompt_sort.sql"),
    include_str!("../migrations/005_chains.sql"),
    include_str!("../migrations/006_eval_scores.sql"),
    include_str!("../migrations/007_branching_envs_tracing.sql"),
];

pub fn init(db_path: &Path) -> AppResult<DbPool> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    // Auto-backup rotation: keep last 7 backups
    if db_path.exists() {
        if let Err(err) = rotate_backups(db_path) {
            eprintln!("backup rotation failed: {err}");
        }
    }

    let conn = Connection::open(db_path)?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    conn.pragma_update(None, "synchronous", "NORMAL")?;

    run_migrations(&conn)?;

    let pool = Arc::new(Mutex::new(conn));

    // Seed sample data on first run
    {
        let conn = pool.lock();
        let first_run: String = conn.query_row(
            "SELECT value FROM app_settings WHERE key = 'first_run_completed'",
            [],
            |row| row.get(0),
        )?;
        if first_run == "false" {
            drop(conn);
            seed_sample_data(&pool)?;
        }
    }

    Ok(pool)
}

fn rotate_backups(db_path: &Path) -> std::io::Result<()> {
    let Some(parent) = db_path.parent() else {
        return Ok(());
    };
    let Some(file_name) = db_path.file_name().and_then(|s| s.to_str()) else {
        return Ok(());
    };
    let backups_dir = parent.join("backups");
    std::fs::create_dir_all(&backups_dir)?;

    let timestamp = Utc::now().format("%Y%m%d-%H%M%S");
    let backup_name = format!("{file_name}.{timestamp}.bak");
    std::fs::copy(db_path, backups_dir.join(backup_name))?;

    // Keep only the 7 most recent
    let mut entries: Vec<_> = std::fs::read_dir(&backups_dir)?
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.file_name()
                .to_string_lossy()
                .starts_with(&format!("{file_name}."))
        })
        .collect();
    entries.sort_by_key(|e| e.file_name());
    if entries.len() > 7 {
        for old in &entries[..entries.len() - 7] {
            let _ = std::fs::remove_file(old.path());
        }
    }
    Ok(())
}

fn run_migrations(conn: &Connection) -> AppResult<()> {
    let current_version: i64 =
        conn.pragma_query_value(None, "user_version", |row| row.get(0))?;

    for (i, sql) in MIGRATIONS.iter().enumerate() {
        let version = (i + 1) as i64;
        if current_version < version {
            conn.execute_batch(sql)?;
            conn.pragma_update(None, "user_version", version)?;
        }
    }
    Ok(())
}

fn seed_sample_data(pool: &DbPool) -> AppResult<()> {
    let conn = pool.lock();
    let now = Utc::now().to_rfc3339();

    // Create 3 example folders: Welcome, Writer, Engineer
    let welcome_id = Uuid::new_v4().to_string();
    let writer_id = Uuid::new_v4().to_string();
    let engineer_id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO folders (id, parent_id, name, color, icon, sort_order, sensitive, created_at)
         VALUES (?1, NULL, ?2, ?3, ?4, ?5, 0, ?6)",
        params![welcome_id, "Welcome", "#3b82f6", "👋", 0, now],
    )?;
    conn.execute(
        "INSERT INTO folders (id, parent_id, name, color, icon, sort_order, sensitive, created_at)
         VALUES (?1, NULL, ?2, ?3, ?4, ?5, 0, ?6)",
        params![writer_id, "Writer examples", "#10b981", "✍️", 1, now],
    )?;
    conn.execute(
        "INSERT INTO folders (id, parent_id, name, color, icon, sort_order, sensitive, created_at)
         VALUES (?1, NULL, ?2, ?3, ?4, ?5, 0, ?6)",
        params![engineer_id, "Engineer examples", "#f59e0b", "💻", 2, now],
    )?;

    // Example prompts with a first revision each
    insert_sample_prompt(
        &conn,
        &welcome_id,
        "Welcome to PromptHangar",
        Some("Read this first — a quick tour of the app."),
        "This is your first prompt. Once you edit this text and click Save, \
         a new revision is created automatically. Click an earlier revision \
         in the top right to see the diff.\n\n\
         Tips:\n\
         - Cmd/Ctrl+S saves a revision\n\
         - Cmd/Ctrl+K searches all prompts\n\
         - The Magic Copy button copies the prompt with optional metadata\n\
         - Settings are in the bottom left",
        None,
        &now,
    )?;

    insert_sample_prompt(
        &conn,
        &writer_id,
        "Blog post outline generator",
        Some("Writes a structured outline for a blog post"),
        "You are an experienced copywriter. Write an outline for a blog post \
         about the topic below. Deliver: 1) catchy title, 2) intro hook, \
         3) five H2 sections with sub-points, 4) call-to-action at the end.\n\n\
         Topic: {{topic}}",
        Some("You are an experienced copywriter with 10 years of experience."),
        &now,
    )?;

    insert_sample_prompt(
        &conn,
        &engineer_id,
        "Code review assistant",
        Some("Performs a thorough code review"),
        "Review the code below and provide a code review covering:\n\
         1. Bugs or potential issues\n\
         2. Performance concerns\n\
         3. Security concerns\n\
         4. Code style / readability\n\
         5. Concrete improvement suggestions with code examples\n\n\
         Be critical but constructive. Focus on the most important points.\n\n\
         Code:\n```\n{{code}}\n```",
        Some("You are a senior software engineer with deep knowledge of best practices and security."),
        &now,
    )?;

    conn.execute(
        "UPDATE app_settings SET value = 'true' WHERE key = 'first_run_completed'",
        [],
    )?;

    Ok(())
}

fn insert_sample_prompt(
    conn: &Connection,
    folder_id: &str,
    title: &str,
    description: Option<&str>,
    content: &str,
    system_prompt: Option<&str>,
    now: &str,
) -> AppResult<()> {
    let prompt_id = Uuid::new_v4().to_string();
    let revision_id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO prompts (id, folder_id, title, description, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?5)",
        params![prompt_id, folder_id, title, description, now],
    )?;

    conn.execute(
        "INSERT INTO revisions (id, prompt_id, revision_number, content, system_prompt,
                                model, params, note, flagged, rating, created_at)
         VALUES (?1, ?2, 1, ?3, ?4, NULL, '{}', NULL, 0, NULL, ?5)",
        params![revision_id, prompt_id, content, system_prompt, now],
    )?;

    // Update FTS
    conn.execute(
        "INSERT INTO prompts_fts (prompt_id, title, description, latest_content)
         VALUES (?1, ?2, ?3, ?4)",
        params![prompt_id, title, description.unwrap_or(""), content],
    )?;

    Ok(())
}

/// Helper used by commands to refresh the FTS index after a revision save.
pub fn update_fts(conn: &Connection, prompt_id: &str) -> AppResult<()> {
    // Delete existing FTS row for the prompt
    conn.execute(
        "DELETE FROM prompts_fts WHERE prompt_id = ?1",
        params![prompt_id],
    )?;

    // Get prompt + latest revision content
    let row: Option<(String, Option<String>, Option<String>)> = conn
        .query_row(
            "SELECT p.title, p.description,
                    (SELECT content FROM revisions r
                     WHERE r.prompt_id = p.id
                     ORDER BY r.revision_number DESC LIMIT 1) AS latest_content
             FROM prompts p WHERE p.id = ?1",
            params![prompt_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
        )
        .map(Some)
        .or_else(|err| match err {
            rusqlite::Error::QueryReturnedNoRows => Ok(None),
            other => Err(AppError::Db(other)),
        })?;

    if let Some((title, description, latest_content)) = row {
        conn.execute(
            "INSERT INTO prompts_fts (prompt_id, title, description, latest_content)
             VALUES (?1, ?2, ?3, ?4)",
            params![
                prompt_id,
                title,
                description.unwrap_or_default(),
                latest_content.unwrap_or_default()
            ],
        )?;
    }

    Ok(())
}
