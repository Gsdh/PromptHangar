use crate::db::{update_fts, DbPool};
use crate::error::{AppError, AppResult};
use crate::models::{Chain, ChainStep, ChainWithSteps, Folder, Prompt, PromptWithLatest, Revision, RevisionOutput, SearchHit};
use chrono::{DateTime, Utc};
use rusqlite::{params, Row};
use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

// ---------- helpers ----------

fn parse_dt(s: String) -> AppResult<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(&s)
        .map(|dt| dt.with_timezone(&Utc))
        .map_err(|e| AppError::Internal(format!("bad datetime '{s}': {e}")))
}

fn now_string() -> String {
    Utc::now().to_rfc3339()
}

fn row_to_folder(row: &Row) -> rusqlite::Result<Folder> {
    Ok(Folder {
        id: row.get("id")?,
        parent_id: row.get("parent_id")?,
        name: row.get("name")?,
        color: row.get("color")?,
        icon: row.get("icon")?,
        sort_order: row.get("sort_order")?,
        sensitive: row.get::<_, i64>("sensitive")? != 0,
        created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>("created_at")?)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or_else(|_| Utc::now()),
    })
}

fn row_to_prompt(row: &Row) -> rusqlite::Result<Prompt> {
    // `view_prefs` and `git_workspace_id` may be absent from SELECTs written
    // before those columns existed. Treat missing as None, malformed JSON
    // as None, so old queries and old rows both keep working.
    let view_prefs = row
        .get::<_, Option<String>>("view_prefs")
        .ok()
        .flatten()
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok());
    let git_workspace_id = row
        .get::<_, Option<String>>("git_workspace_id")
        .ok()
        .flatten();
    Ok(Prompt {
        id: row.get("id")?,
        folder_id: row.get("folder_id")?,
        title: row.get("title")?,
        description: row.get("description")?,
        created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>("created_at")?)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or_else(|_| Utc::now()),
        updated_at: DateTime::parse_from_rfc3339(&row.get::<_, String>("updated_at")?)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or_else(|_| Utc::now()),
        view_prefs,
        git_workspace_id,
    })
}

fn row_to_revision(row: &Row) -> rusqlite::Result<Revision> {
    let params_str: String = row.get("params")?;
    let params: serde_json::Value = serde_json::from_str(&params_str)
        .unwrap_or_else(|_| serde_json::json!({}));
    Ok(Revision {
        id: row.get("id")?,
        prompt_id: row.get("prompt_id")?,
        revision_number: row.get("revision_number")?,
        content: row.get("content")?,
        system_prompt: row.get("system_prompt")?,
        model: row.get("model")?,
        params,
        note: row.get("note")?,
        flagged: row.get::<_, i64>("flagged")? != 0,
        rating: row.get("rating")?,
        created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>("created_at")?)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or_else(|_| Utc::now()),
    })
}

// ---------- Folder commands ----------

#[derive(Debug, Deserialize)]
pub struct CreateFolderInput {
    pub name: String,
    pub parent_id: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
}

#[tauri::command]
pub fn list_folders(db: State<DbPool>) -> AppResult<Vec<Folder>> {
    let conn = db.lock();
    let mut stmt = conn.prepare(
        "SELECT id, parent_id, name, color, icon, sort_order, sensitive, created_at
         FROM folders
         ORDER BY sort_order ASC, name ASC",
    )?;
    let rows = stmt.query_map([], row_to_folder)?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r?);
    }
    Ok(out)
}

#[tauri::command]
pub fn create_folder(db: State<DbPool>, input: CreateFolderInput) -> AppResult<Folder> {
    let conn = db.lock();
    let id = Uuid::new_v4().to_string();
    let now = now_string();

    // Next sort order in the same parent
    let sort_order: i64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM folders
         WHERE parent_id IS ?1 OR (parent_id IS NULL AND ?1 IS NULL)",
        params![input.parent_id],
        |r| r.get(0),
    )?;

    conn.execute(
        "INSERT INTO folders (id, parent_id, name, color, icon, sort_order, sensitive, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7)",
        params![
            id,
            input.parent_id,
            input.name,
            input.color,
            input.icon,
            sort_order,
            now
        ],
    )?;

    Ok(Folder {
        id,
        parent_id: input.parent_id,
        name: input.name,
        color: input.color,
        icon: input.icon,
        sort_order,
        sensitive: false,
        created_at: parse_dt(now)?,
    })
}

#[derive(Debug, Deserialize)]
pub struct UpdateFolderInput {
    pub id: String,
    pub name: Option<String>,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub sensitive: Option<bool>,
}

#[tauri::command]
pub fn update_folder(db: State<DbPool>, input: UpdateFolderInput) -> AppResult<()> {
    let conn = db.lock();
    if let Some(name) = &input.name {
        conn.execute(
            "UPDATE folders SET name = ?1 WHERE id = ?2",
            params![name, input.id],
        )?;
    }
    if let Some(color) = &input.color {
        conn.execute(
            "UPDATE folders SET color = ?1 WHERE id = ?2",
            params![color, input.id],
        )?;
    }
    if let Some(icon) = &input.icon {
        conn.execute(
            "UPDATE folders SET icon = ?1 WHERE id = ?2",
            params![icon, input.id],
        )?;
    }
    if let Some(sensitive) = input.sensitive {
        conn.execute(
            "UPDATE folders SET sensitive = ?1 WHERE id = ?2",
            params![sensitive as i64, input.id],
        )?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_folder(db: State<DbPool>, id: String) -> AppResult<()> {
    let conn = db.lock();
    conn.execute("DELETE FROM folders WHERE id = ?1", params![id])?;
    Ok(())
}

// ---------- Prompt commands ----------

#[derive(Debug, Deserialize)]
pub struct CreatePromptInput {
    pub title: String,
    pub folder_id: Option<String>,
    pub description: Option<String>,
    pub initial_content: Option<String>,
}

#[tauri::command]
pub fn list_prompts(
    db: State<DbPool>,
    folder_id: Option<String>,
) -> AppResult<Vec<PromptWithLatest>> {
    let conn = db.lock();
    let mut stmt = if folder_id.is_some() {
        conn.prepare(
            "SELECT id, folder_id, title, description, created_at, updated_at,
                    view_prefs, git_workspace_id
             FROM prompts WHERE folder_id = ?1
             ORDER BY sort_order ASC, updated_at DESC",
        )?
    } else {
        conn.prepare(
            "SELECT id, folder_id, title, description, created_at, updated_at,
                    view_prefs, git_workspace_id
             FROM prompts ORDER BY sort_order ASC, updated_at DESC",
        )?
    };

    let prompts: Vec<Prompt> = if let Some(fid) = &folder_id {
        stmt.query_map(params![fid], row_to_prompt)?
            .collect::<rusqlite::Result<Vec<_>>>()?
    } else {
        stmt.query_map([], row_to_prompt)?
            .collect::<rusqlite::Result<Vec<_>>>()?
    };

    let mut out = Vec::with_capacity(prompts.len());
    for prompt in prompts {
        let (latest, count) = latest_and_count(&conn, &prompt.id)?;
        let tags = load_tags(&conn, &prompt.id)?;
        out.push(PromptWithLatest {
            prompt,
            latest_revision: latest,
            revision_count: count,
            tags,
        });
    }
    Ok(out)
}

fn latest_and_count(
    conn: &rusqlite::Connection,
    prompt_id: &str,
) -> AppResult<(Option<Revision>, i64)> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM revisions WHERE prompt_id = ?1",
        params![prompt_id],
        |r| r.get(0),
    )?;
    if count == 0 {
        return Ok((None, 0));
    }
    let latest: Revision = conn.query_row(
        "SELECT id, prompt_id, revision_number, content, system_prompt, model,
                params, note, flagged, rating, created_at
         FROM revisions WHERE prompt_id = ?1
         ORDER BY revision_number DESC LIMIT 1",
        params![prompt_id],
        row_to_revision,
    )?;
    Ok((Some(latest), count))
}

fn load_tags(conn: &rusqlite::Connection, prompt_id: &str) -> AppResult<Vec<String>> {
    let mut stmt = conn.prepare(
        "SELECT tag FROM prompt_tags WHERE prompt_id = ?1 ORDER BY tag ASC",
    )?;
    let rows = stmt.query_map(params![prompt_id], |r| r.get::<_, String>(0))?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r?);
    }
    Ok(out)
}

/// Normalize a tag: trim, lowercase, collapse inner whitespace.
fn canonical_tag(raw: &str) -> String {
    raw.trim().to_lowercase().split_whitespace().collect::<Vec<_>>().join("-")
}

#[tauri::command]
pub fn get_prompt(db: State<DbPool>, id: String) -> AppResult<PromptWithLatest> {
    let conn = db.lock();
    let prompt: Prompt = conn.query_row(
        "SELECT id, folder_id, title, description, created_at, updated_at,
                view_prefs, git_workspace_id
         FROM prompts WHERE id = ?1",
        params![id],
        row_to_prompt,
    )?;
    let (latest, count) = latest_and_count(&conn, &prompt.id)?;
    let tags = load_tags(&conn, &prompt.id)?;
    Ok(PromptWithLatest {
        prompt,
        latest_revision: latest,
        revision_count: count,
        tags,
    })
}

#[tauri::command]
pub fn create_prompt(db: State<DbPool>, input: CreatePromptInput) -> AppResult<PromptWithLatest> {
    let conn = db.lock();
    let id = Uuid::new_v4().to_string();
    let now = now_string();

    conn.execute(
        "INSERT INTO prompts (id, folder_id, title, description, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?5)",
        params![id, input.folder_id, input.title, input.description, now],
    )?;

    // Initial revision (empty or provided)
    let content = input.initial_content.unwrap_or_default();
    let rev_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO revisions (id, prompt_id, revision_number, content, system_prompt,
                                model, params, note, flagged, rating, created_at)
         VALUES (?1, ?2, 1, ?3, NULL, NULL, '{}', NULL, 0, NULL, ?4)",
        params![rev_id, id, content, now],
    )?;

    update_fts(&conn, &id)?;

    let prompt: Prompt = conn.query_row(
        "SELECT id, folder_id, title, description, created_at, updated_at,
                view_prefs, git_workspace_id
         FROM prompts WHERE id = ?1",
        params![id],
        row_to_prompt,
    )?;
    let (latest, count) = latest_and_count(&conn, &prompt.id)?;
    let tags = load_tags(&conn, &prompt.id)?;
    Ok(PromptWithLatest {
        prompt,
        latest_revision: latest,
        revision_count: count,
        tags,
    })
}

#[derive(Debug, Deserialize)]
pub struct UpdatePromptInput {
    pub id: String,
    pub title: Option<String>,
    pub description: Option<String>,
    pub folder_id: Option<String>,
    /// JSON blob of UI preferences (color-by, etc.). Epic 3.
    #[serde(default)]
    pub view_prefs: Option<serde_json::Value>,
    /// Link this prompt to a Git workspace, or `null` to unlink. Epic 2.
    #[serde(default)]
    pub git_workspace_id: Option<Option<String>>,
}

#[tauri::command]
pub fn update_prompt(db: State<DbPool>, input: UpdatePromptInput) -> AppResult<()> {
    let conn = db.lock();
    let now = now_string();
    if let Some(title) = &input.title {
        conn.execute(
            "UPDATE prompts SET title = ?1, updated_at = ?2 WHERE id = ?3",
            params![title, now, input.id],
        )?;
    }
    if let Some(desc) = &input.description {
        conn.execute(
            "UPDATE prompts SET description = ?1, updated_at = ?2 WHERE id = ?3",
            params![desc, now, input.id],
        )?;
    }
    if let Some(fid) = &input.folder_id {
        conn.execute(
            "UPDATE prompts SET folder_id = ?1, updated_at = ?2 WHERE id = ?3",
            params![fid, now, input.id],
        )?;
    }
    if let Some(view_prefs) = &input.view_prefs {
        // `view_prefs` is a JSON value; we persist it as a text blob so we can
        // add more fields without migrations. See Epic 3.
        let serialized = serde_json::to_string(view_prefs)?;
        conn.execute(
            "UPDATE prompts SET view_prefs = ?1, updated_at = ?2 WHERE id = ?3",
            params![serialized, now, input.id],
        )?;
    }
    if let Some(workspace_opt) = &input.git_workspace_id {
        // `Some(Some(id))` → link, `Some(None)` → unlink. `None` → leave alone.
        conn.execute(
            "UPDATE prompts SET git_workspace_id = ?1, updated_at = ?2 WHERE id = ?3",
            params![workspace_opt, now, input.id],
        )?;
    }
    update_fts(&conn, &input.id)?;
    Ok(())
}

#[tauri::command]
pub fn delete_prompt(db: State<DbPool>, id: String) -> AppResult<()> {
    let conn = db.lock();
    conn.execute("DELETE FROM prompts WHERE id = ?1", params![id])?;
    conn.execute("DELETE FROM prompts_fts WHERE prompt_id = ?1", params![id])?;
    Ok(())
}

// ---------- Tag commands ----------

#[derive(Debug, Deserialize)]
pub struct SetPromptTagsInput {
    pub prompt_id: String,
    pub tags: Vec<String>,
}

#[tauri::command]
pub fn set_prompt_tags(db: State<DbPool>, input: SetPromptTagsInput) -> AppResult<Vec<String>> {
    let conn = db.lock();

    // Canonicalise + de-dup
    let mut canon: Vec<String> = input
        .tags
        .into_iter()
        .map(|t| canonical_tag(&t))
        .filter(|t| !t.is_empty())
        .collect();
    canon.sort();
    canon.dedup();

    conn.execute(
        "DELETE FROM prompt_tags WHERE prompt_id = ?1",
        params![input.prompt_id],
    )?;
    for tag in &canon {
        conn.execute(
            "INSERT OR IGNORE INTO prompt_tags (prompt_id, tag) VALUES (?1, ?2)",
            params![input.prompt_id, tag],
        )?;
    }
    Ok(canon)
}

#[tauri::command]
pub fn list_all_tags(db: State<DbPool>) -> AppResult<Vec<String>> {
    let conn = db.lock();
    let mut stmt = conn.prepare(
        "SELECT DISTINCT tag FROM prompt_tags ORDER BY tag ASC",
    )?;
    let rows = stmt.query_map([], |r| r.get::<_, String>(0))?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r?);
    }
    Ok(out)
}

// ---------- Revision commands ----------

#[derive(Debug, Deserialize)]
pub struct SaveRevisionInput {
    pub prompt_id: String,
    pub content: String,
    pub system_prompt: Option<String>,
    pub model: Option<String>,
    pub params: Option<serde_json::Value>,
    pub note: Option<String>,
}

#[tauri::command]
pub fn save_revision(db: State<DbPool>, input: SaveRevisionInput) -> AppResult<Revision> {
    let conn = db.lock();
    let now = now_string();
    let id = Uuid::new_v4().to_string();

    // Next revision number
    let next: i64 = conn.query_row(
        "SELECT COALESCE(MAX(revision_number), 0) + 1 FROM revisions WHERE prompt_id = ?1",
        params![input.prompt_id],
        |r| r.get(0),
    )?;

    // Skip if content + metadata identical to latest (no-op save)
    if next > 1 {
        let latest: (String, Option<String>, Option<String>, String) = conn.query_row(
            "SELECT content, system_prompt, model, params FROM revisions
             WHERE prompt_id = ?1 ORDER BY revision_number DESC LIMIT 1",
            params![&input.prompt_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
        )?;
        let same_content = latest.0 == input.content;
        let same_system = latest.1 == input.system_prompt;
        let same_model = latest.2 == input.model;
        let incoming_params = input
            .params
            .clone()
            .unwrap_or_else(|| serde_json::json!({}));
        let same_params = latest.3 == incoming_params.to_string();
        if same_content && same_system && same_model && same_params {
            // Return the latest revision instead of creating a duplicate
            return conn
                .query_row(
                    "SELECT id, prompt_id, revision_number, content, system_prompt, model,
                            params, note, flagged, rating, created_at
                     FROM revisions WHERE prompt_id = ?1
                     ORDER BY revision_number DESC LIMIT 1",
                    params![&input.prompt_id],
                    row_to_revision,
                )
                .map_err(AppError::from);
        }
    }

    let params_json = input
        .params
        .clone()
        .unwrap_or_else(|| serde_json::json!({}))
        .to_string();

    conn.execute(
        "INSERT INTO revisions (id, prompt_id, revision_number, content, system_prompt,
                                model, params, note, flagged, rating, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, NULL, ?9)",
        params![
            id,
            input.prompt_id,
            next,
            input.content,
            input.system_prompt,
            input.model,
            params_json,
            input.note,
            now
        ],
    )?;

    conn.execute(
        "UPDATE prompts SET updated_at = ?1 WHERE id = ?2",
        params![now, input.prompt_id],
    )?;

    update_fts(&conn, &input.prompt_id)?;

    Ok(Revision {
        id,
        prompt_id: input.prompt_id,
        revision_number: next,
        content: input.content,
        system_prompt: input.system_prompt,
        model: input.model,
        params: input.params.unwrap_or_else(|| serde_json::json!({})),
        note: input.note,
        flagged: false,
        rating: None,
        created_at: parse_dt(now)?,
    })
}

#[tauri::command]
pub fn list_revisions(db: State<DbPool>, prompt_id: String) -> AppResult<Vec<Revision>> {
    let conn = db.lock();
    let mut stmt = conn.prepare(
        "SELECT id, prompt_id, revision_number, content, system_prompt, model,
                params, note, flagged, rating, created_at
         FROM revisions WHERE prompt_id = ?1
         ORDER BY revision_number DESC",
    )?;
    let rows = stmt.query_map(params![prompt_id], row_to_revision)?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r?);
    }
    Ok(out)
}

fn row_to_output(row: &Row) -> rusqlite::Result<RevisionOutput> {
    let run_group_id = row
        .get::<_, Option<String>>("run_group_id")
        .ok()
        .flatten();
    Ok(RevisionOutput {
        id: row.get("id")?,
        revision_id: row.get("revision_id")?,
        label: row.get("label")?,
        content: row.get("content")?,
        notes: row.get("notes")?,
        rating: row.get("rating")?,
        sort_order: row.get("sort_order")?,
        created_at: DateTime::parse_from_rfc3339(&row.get::<_, String>("created_at")?)
            .map(|dt| dt.with_timezone(&Utc))
            .unwrap_or_else(|_| Utc::now()),
        run_group_id,
    })
}

#[derive(Debug, Deserialize)]
pub struct CreateOutputInput {
    pub revision_id: String,
    pub label: Option<String>,
    pub content: String,
    pub notes: Option<String>,
    /// Optional group id linking outputs from the same multi-run /
    /// multi-provider click (Epics 5 & 6). Defaults to None for
    /// one-off single runs.
    #[serde(default)]
    pub run_group_id: Option<String>,
}

#[tauri::command]
pub fn list_outputs(db: State<DbPool>, revision_id: String) -> AppResult<Vec<RevisionOutput>> {
    let conn = db.lock();
    let mut stmt = conn.prepare(
        "SELECT id, revision_id, label, content, notes, rating, sort_order, created_at,
                run_group_id
         FROM revision_outputs
         WHERE revision_id = ?1
         ORDER BY sort_order ASC, created_at ASC",
    )?;
    let rows = stmt.query_map(params![revision_id], row_to_output)?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r?);
    }
    Ok(out)
}

#[tauri::command]
pub fn create_output(db: State<DbPool>, input: CreateOutputInput) -> AppResult<RevisionOutput> {
    let conn = db.lock();
    let id = Uuid::new_v4().to_string();
    let now = now_string();
    let sort_order: i64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM revision_outputs WHERE revision_id = ?1",
        params![input.revision_id],
        |r| r.get(0),
    )?;

    conn.execute(
        "INSERT INTO revision_outputs (id, revision_id, label, content, notes, rating,
                                       sort_order, created_at, run_group_id)
         VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6, ?7, ?8)",
        params![
            id,
            input.revision_id,
            input.label,
            input.content,
            input.notes,
            sort_order,
            now,
            input.run_group_id,
        ],
    )?;

    Ok(RevisionOutput {
        id,
        revision_id: input.revision_id,
        label: input.label,
        content: input.content,
        notes: input.notes,
        rating: None,
        sort_order,
        created_at: parse_dt(now)?,
        run_group_id: input.run_group_id,
    })
}

#[derive(Debug, Deserialize)]
pub struct UpdateOutputInput {
    pub id: String,
    pub label: Option<String>,
    pub content: Option<String>,
    pub notes: Option<String>,
    pub rating: Option<i64>,
}

#[tauri::command]
pub fn update_output(db: State<DbPool>, input: UpdateOutputInput) -> AppResult<()> {
    let conn = db.lock();
    if let Some(label) = &input.label {
        conn.execute(
            "UPDATE revision_outputs SET label = ?1 WHERE id = ?2",
            params![label, input.id],
        )?;
    }
    if let Some(content) = &input.content {
        conn.execute(
            "UPDATE revision_outputs SET content = ?1 WHERE id = ?2",
            params![content, input.id],
        )?;
    }
    if let Some(notes) = &input.notes {
        conn.execute(
            "UPDATE revision_outputs SET notes = ?1 WHERE id = ?2",
            params![notes, input.id],
        )?;
    }
    if let Some(rating) = input.rating {
        conn.execute(
            "UPDATE revision_outputs SET rating = ?1 WHERE id = ?2",
            params![rating, input.id],
        )?;
    }
    Ok(())
}

#[tauri::command]
pub fn delete_output(db: State<DbPool>, id: String) -> AppResult<()> {
    let conn = db.lock();
    conn.execute("DELETE FROM revision_outputs WHERE id = ?1", params![id])?;
    Ok(())
}

#[tauri::command]
pub fn toggle_revision_flag(db: State<DbPool>, id: String) -> AppResult<bool> {
    let conn = db.lock();
    let current: i64 = conn.query_row(
        "SELECT flagged FROM revisions WHERE id = ?1",
        params![id],
        |r| r.get(0),
    )?;
    let new_val = if current == 0 { 1 } else { 0 };
    conn.execute(
        "UPDATE revisions SET flagged = ?1 WHERE id = ?2",
        params![new_val, id],
    )?;
    Ok(new_val != 0)
}

#[derive(Debug, Deserialize)]
pub struct UpdateRevisionMetaInput {
    pub id: String,
    pub note: Option<String>,
    pub flagged: Option<bool>,
    pub rating: Option<i64>,
}

#[tauri::command]
pub fn update_revision_meta(
    db: State<DbPool>,
    input: UpdateRevisionMetaInput,
) -> AppResult<()> {
    let conn = db.lock();
    if let Some(note) = &input.note {
        // Empty string -> NULL so the UI never shows a dangling empty note
        if note.is_empty() {
            conn.execute(
                "UPDATE revisions SET note = NULL WHERE id = ?1",
                params![input.id],
            )?;
        } else {
            conn.execute(
                "UPDATE revisions SET note = ?1 WHERE id = ?2",
                params![note, input.id],
            )?;
        }
    }
    if let Some(flagged) = input.flagged {
        conn.execute(
            "UPDATE revisions SET flagged = ?1 WHERE id = ?2",
            params![flagged as i64, input.id],
        )?;
    }
    if let Some(rating) = input.rating {
        conn.execute(
            "UPDATE revisions SET rating = ?1 WHERE id = ?2",
            params![rating, input.id],
        )?;
    }
    Ok(())
}

// ---------- Search ----------

#[tauri::command]
pub fn search_prompts(db: State<DbPool>, query: String) -> AppResult<Vec<SearchHit>> {
    if query.trim().is_empty() {
        return Ok(vec![]);
    }
    let conn = db.lock();
    // Quote the query to avoid FTS5 operator collisions for the MVP
    let fts_query = format!("\"{}\"", query.replace('"', ""));
    let mut stmt = conn.prepare(
        "SELECT f.prompt_id,
                f.title,
                f.description,
                snippet(prompts_fts, 3, '<mark>', '</mark>', '…', 20) AS snippet,
                p.folder_id
         FROM prompts_fts f
         JOIN prompts p ON p.id = f.prompt_id
         WHERE prompts_fts MATCH ?1
         ORDER BY rank
         LIMIT 50",
    )?;
    let rows = stmt.query_map(params![fts_query], |row| {
        Ok(SearchHit {
            prompt_id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            snippet: row.get(3)?,
            folder_id: row.get(4)?,
        })
    })?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r?);
    }
    Ok(out)
}

// ---------- Chains ----------

#[derive(Debug, Deserialize)]
pub struct CreateChainInput {
    pub name: String,
    pub description: Option<String>,
    pub folder_id: Option<String>,
    pub prompt_ids: Vec<String>,
}

#[tauri::command]
pub fn list_chains(db: State<DbPool>) -> AppResult<Vec<ChainWithSteps>> {
    let conn = db.lock();
    let mut stmt = conn.prepare(
        "SELECT id, name, description, folder_id, created_at, updated_at
         FROM chains ORDER BY updated_at DESC",
    )?;
    let chains: Vec<Chain> = stmt
        .query_map([], |r| {
            Ok(Chain {
                id: r.get("id")?,
                name: r.get("name")?,
                description: r.get("description")?,
                folder_id: r.get("folder_id")?,
                created_at: DateTime::parse_from_rfc3339(&r.get::<_, String>("created_at")?)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
                updated_at: DateTime::parse_from_rfc3339(&r.get::<_, String>("updated_at")?)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now()),
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut out = Vec::new();
    for chain in chains {
        let steps = load_chain_steps(&conn, &chain.id)?;
        out.push(ChainWithSteps { chain, steps });
    }
    Ok(out)
}

fn load_chain_steps(conn: &rusqlite::Connection, chain_id: &str) -> AppResult<Vec<ChainStep>> {
    let mut stmt = conn.prepare(
        "SELECT cs.id, cs.chain_id, cs.prompt_id, p.title AS prompt_title,
                cs.step_order, cs.transform, cs.created_at
         FROM chain_steps cs
         LEFT JOIN prompts p ON p.id = cs.prompt_id
         WHERE cs.chain_id = ?1
         ORDER BY cs.step_order ASC",
    )?;
    let rows = stmt.query_map(params![chain_id], |r| -> rusqlite::Result<ChainStep> {
        Ok(ChainStep {
            id: r.get("id")?,
            chain_id: r.get("chain_id")?,
            prompt_id: r.get("prompt_id")?,
            prompt_title: r.get("prompt_title")?,
            step_order: r.get("step_order")?,
            transform: r.get("transform")?,
            created_at: DateTime::parse_from_rfc3339(&r.get::<_, String>("created_at")?)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now()),
        })
    })?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r?);
    }
    Ok(out)
}

#[tauri::command]
pub fn create_chain(db: State<DbPool>, input: CreateChainInput) -> AppResult<ChainWithSteps> {
    let conn = db.lock();
    let id = Uuid::new_v4().to_string();
    let now = now_string();

    conn.execute(
        "INSERT INTO chains (id, name, description, folder_id, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?5)",
        params![id, input.name, input.description, input.folder_id, now],
    )?;

    for (i, prompt_id) in input.prompt_ids.iter().enumerate() {
        let step_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO chain_steps (id, chain_id, prompt_id, step_order, transform, created_at)
             VALUES (?1, ?2, ?3, ?4, NULL, ?5)",
            params![step_id, id, prompt_id, i as i64, now],
        )?;
    }

    let chain = Chain {
        id: id.clone(),
        name: input.name,
        description: input.description,
        folder_id: input.folder_id,
        created_at: parse_dt(now.clone())?,
        updated_at: parse_dt(now)?,
    };
    let steps = load_chain_steps(&conn, &chain.id)?;
    Ok(ChainWithSteps { chain, steps })
}

#[tauri::command]
pub fn delete_chain(db: State<DbPool>, id: String) -> AppResult<()> {
    let conn = db.lock();
    conn.execute("DELETE FROM chains WHERE id = ?1", params![id])?;
    Ok(())
}

/// Get the latest revision content for each step in a chain.
/// Returns ordered list of { prompt_id, title, content, system_prompt }.
#[tauri::command]
pub fn get_chain_contents(
    db: State<DbPool>,
    chain_id: String,
) -> AppResult<Vec<serde_json::Value>> {
    let conn = db.lock();
    let mut stmt = conn.prepare(
        "SELECT cs.prompt_id, p.title,
                (SELECT r.content FROM revisions r WHERE r.prompt_id = cs.prompt_id
                 ORDER BY r.revision_number DESC LIMIT 1) AS content,
                (SELECT r.system_prompt FROM revisions r WHERE r.prompt_id = cs.prompt_id
                 ORDER BY r.revision_number DESC LIMIT 1) AS system_prompt
         FROM chain_steps cs
         JOIN prompts p ON p.id = cs.prompt_id
         WHERE cs.chain_id = ?1
         ORDER BY cs.step_order ASC",
    )?;
    let rows = stmt.query_map(params![chain_id], |r| {
        Ok(serde_json::json!({
            "prompt_id": r.get::<_, String>(0)?,
            "title": r.get::<_, Option<String>>(1)?,
            "content": r.get::<_, Option<String>>(2)?,
            "system_prompt": r.get::<_, Option<String>>(3)?,
        }))
    })?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r?);
    }
    Ok(out)
}

// ---------- Smart folders / filtered queries ----------

#[tauri::command]
pub fn list_recent_prompts(db: State<DbPool>, limit: Option<i64>) -> AppResult<Vec<PromptWithLatest>> {
    let conn = db.lock();
    let lim = limit.unwrap_or(20);
    let mut stmt = conn.prepare(
        "SELECT id, folder_id, title, description, created_at, updated_at,
                view_prefs, git_workspace_id
         FROM prompts ORDER BY updated_at DESC LIMIT ?1",
    )?;
    let prompts: Vec<Prompt> = stmt
        .query_map(params![lim], row_to_prompt)?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut out = Vec::with_capacity(prompts.len());
    for prompt in prompts {
        let (latest, count) = latest_and_count(&conn, &prompt.id)?;
        let tags = load_tags(&conn, &prompt.id)?;
        out.push(PromptWithLatest { prompt, latest_revision: latest, revision_count: count, tags });
    }
    Ok(out)
}

#[tauri::command]
pub fn list_flagged_prompts(db: State<DbPool>) -> AppResult<Vec<PromptWithLatest>> {
    let conn = db.lock();
    // A prompt is "flagged" if any of its revisions is flagged
    let mut stmt = conn.prepare(
        "SELECT DISTINCT p.id, p.folder_id, p.title, p.description, p.created_at, p.updated_at,
                        p.view_prefs, p.git_workspace_id
         FROM prompts p
         JOIN revisions r ON r.prompt_id = p.id
         WHERE r.flagged = 1
         ORDER BY p.updated_at DESC",
    )?;
    let prompts: Vec<Prompt> = stmt
        .query_map([], row_to_prompt)?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut out = Vec::with_capacity(prompts.len());
    for prompt in prompts {
        let (latest, count) = latest_and_count(&conn, &prompt.id)?;
        let tags = load_tags(&conn, &prompt.id)?;
        out.push(PromptWithLatest { prompt, latest_revision: latest, revision_count: count, tags });
    }
    Ok(out)
}

#[tauri::command]
pub fn get_stats(db: State<DbPool>) -> AppResult<serde_json::Value> {
    let conn = db.lock();
    let total_prompts: i64 = conn.query_row("SELECT COUNT(*) FROM prompts", [], |r| r.get(0))?;
    let total_revisions: i64 = conn.query_row("SELECT COUNT(*) FROM revisions", [], |r| r.get(0))?;
    let total_outputs: i64 = conn.query_row("SELECT COUNT(*) FROM revision_outputs", [], |r| r.get(0))?;
    let total_folders: i64 = conn.query_row("SELECT COUNT(*) FROM folders", [], |r| r.get(0))?;
    let flagged_revisions: i64 = conn.query_row(
        "SELECT COUNT(*) FROM revisions WHERE flagged = 1", [], |r| r.get(0)
    )?;

    // Top 5 tags by usage
    let mut tag_stmt = conn.prepare(
        "SELECT tag, COUNT(*) as cnt FROM prompt_tags GROUP BY tag ORDER BY cnt DESC LIMIT 5"
    )?;
    let top_tags: Vec<(String, i64)> = tag_stmt
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    // Most revised prompts (top 5)
    let mut rev_stmt = conn.prepare(
        "SELECT p.title, COUNT(r.id) as rev_count
         FROM prompts p JOIN revisions r ON r.prompt_id = p.id
         GROUP BY p.id ORDER BY rev_count DESC LIMIT 5"
    )?;
    let most_revised: Vec<(String, i64)> = rev_stmt
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    Ok(serde_json::json!({
        "total_prompts": total_prompts,
        "total_revisions": total_revisions,
        "total_outputs": total_outputs,
        "total_folders": total_folders,
        "flagged_revisions": flagged_revisions,
        "top_tags": top_tags.into_iter().map(|(t, c)| serde_json::json!({"tag": t, "count": c})).collect::<Vec<_>>(),
        "most_revised": most_revised.into_iter().map(|(t, c)| serde_json::json!({"title": t, "revisions": c})).collect::<Vec<_>>(),
    }))
}

#[tauri::command]
pub fn duplicate_prompt(db: State<DbPool>, prompt_id: String) -> AppResult<PromptWithLatest> {
    let conn = db.lock();
    let now = now_string();
    let new_id = Uuid::new_v4().to_string();

    // Copy prompt
    let src: Prompt = conn.query_row(
        "SELECT id, folder_id, title, description, created_at, updated_at,
                view_prefs, git_workspace_id
         FROM prompts WHERE id = ?1",
        params![prompt_id],
        row_to_prompt,
    )?;

    let new_title = format!("{} (kopie)", src.title);
    conn.execute(
        "INSERT INTO prompts (id, folder_id, title, description, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 0, ?5, ?5)",
        params![new_id, src.folder_id, new_title, src.description, now],
    )?;

    // Copy latest revision only
    let latest_opt: Option<Revision> = conn
        .query_row(
            "SELECT id, prompt_id, revision_number, content, system_prompt, model,
                    params, note, flagged, rating, created_at
             FROM revisions WHERE prompt_id = ?1
             ORDER BY revision_number DESC LIMIT 1",
            params![prompt_id],
            row_to_revision,
        )
        .map(Some)
        .or_else(|err| match err {
            rusqlite::Error::QueryReturnedNoRows => Ok(None),
            other => Err(AppError::Db(other)),
        })?;

    if let Some(latest) = &latest_opt {
        let rev_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO revisions (id, prompt_id, revision_number, content, system_prompt,
                                    model, params, note, flagged, rating, created_at)
             VALUES (?1, ?2, 1, ?3, ?4, ?5, ?6, ?7, 0, NULL, ?8)",
            params![
                rev_id, new_id, latest.content, latest.system_prompt, latest.model,
                latest.params.to_string(), latest.note, now
            ],
        )?;
    }

    // Copy tags
    let src_tags = load_tags(&conn, &prompt_id)?;
    for tag in &src_tags {
        conn.execute(
            "INSERT OR IGNORE INTO prompt_tags (prompt_id, tag) VALUES (?1, ?2)",
            params![new_id, tag],
        )?;
    }

    update_fts(&conn, &new_id)?;

    // Return the new prompt
    let prompt: Prompt = conn.query_row(
        "SELECT id, folder_id, title, description, created_at, updated_at,
                view_prefs, git_workspace_id
         FROM prompts WHERE id = ?1",
        params![new_id],
        row_to_prompt,
    )?;
    let (latest, count) = latest_and_count(&conn, &new_id)?;
    let tags = load_tags(&conn, &new_id)?;
    Ok(PromptWithLatest { prompt, latest_revision: latest, revision_count: count, tags })
}

// ---------- Branching ----------

#[tauri::command]
pub fn create_branch(
    db: State<DbPool>,
    revision_id: String,
    branch_name: String,
) -> AppResult<Revision> {
    let conn = db.lock();
    let now = now_string();

    // Get the source revision
    let src: Revision = conn.query_row(
        "SELECT id, prompt_id, revision_number, content, system_prompt, model,
                params, note, flagged, rating, created_at
         FROM revisions WHERE id = ?1",
        params![revision_id],
        row_to_revision,
    )?;

    // Next revision number globally for this prompt
    let next_num: i64 = conn.query_row(
        "SELECT COALESCE(MAX(revision_number), 0) + 1 FROM revisions WHERE prompt_id = ?1",
        params![src.prompt_id],
        |r| r.get(0),
    )?;

    let new_id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO revisions (id, prompt_id, revision_number, content, system_prompt,
                                model, params, note, flagged, rating, parent_revision_id, branch_name, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, NULL, ?9, ?10, ?11)",
        params![
            new_id, src.prompt_id, next_num, src.content, src.system_prompt,
            src.model, src.params.to_string(), format!("Branched from #{}", src.revision_number),
            revision_id, branch_name, now
        ],
    )?;

    conn.query_row(
        "SELECT id, prompt_id, revision_number, content, system_prompt, model,
                params, note, flagged, rating, created_at
         FROM revisions WHERE id = ?1",
        params![new_id],
        row_to_revision,
    )
    .map_err(AppError::from)
}

#[tauri::command]
pub fn list_branches(db: State<DbPool>, prompt_id: String) -> AppResult<Vec<String>> {
    let conn = db.lock();
    let mut stmt = conn.prepare(
        "SELECT DISTINCT COALESCE(branch_name, 'main') FROM revisions WHERE prompt_id = ?1 ORDER BY branch_name",
    )?;
    let rows = stmt.query_map(params![prompt_id], |r| r.get::<_, String>(0))?;
    let mut out = Vec::new();
    for r in rows { out.push(r?); }
    Ok(out)
}

// ---------- Environments ----------

#[tauri::command]
pub fn promote_to_env(
    db: State<DbPool>,
    prompt_id: String,
    env_name: String,
    revision_id: String,
) -> AppResult<()> {
    let conn = db.lock();
    let now = now_string();
    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO environments (id, prompt_id, env_name, revision_id, promoted_at)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(prompt_id, env_name) DO UPDATE SET revision_id = excluded.revision_id, promoted_at = excluded.promoted_at",
        params![id, prompt_id, env_name, revision_id, now],
    )?;
    Ok(())
}

#[tauri::command]
pub fn get_environments(db: State<DbPool>, prompt_id: String) -> AppResult<Vec<serde_json::Value>> {
    let conn = db.lock();
    let mut stmt = conn.prepare(
        "SELECT e.env_name, e.revision_id, r.revision_number, e.promoted_at
         FROM environments e
         JOIN revisions r ON r.id = e.revision_id
         WHERE e.prompt_id = ?1
         ORDER BY CASE e.env_name WHEN 'production' THEN 1 WHEN 'staging' THEN 2 WHEN 'development' THEN 3 ELSE 4 END",
    )?;
    let rows = stmt.query_map(params![prompt_id], |r| {
        Ok(serde_json::json!({
            "env_name": r.get::<_, String>(0)?,
            "revision_id": r.get::<_, String>(1)?,
            "revision_number": r.get::<_, i64>(2)?,
            "promoted_at": r.get::<_, String>(3)?,
        }))
    })?;
    let mut out = Vec::new();
    for r in rows { out.push(r?); }
    Ok(out)
}

// ---------- A/B Testing ----------

#[tauri::command]
pub fn create_ab_test(
    db: State<DbPool>,
    prompt_id: String,
    name: String,
    variant_revision_ids: Vec<String>,
) -> AppResult<String> {
    if variant_revision_ids.is_empty() {
        return Err(AppError::Invalid("A/B test requires at least one variant".into()));
    }
    let conn = db.lock();
    let now = now_string();
    let test_id = Uuid::new_v4().to_string();
    let weight = 1.0 / variant_revision_ids.len() as f64;

    conn.execute(
        "INSERT INTO ab_tests (id, prompt_id, name, status, created_at) VALUES (?1, ?2, ?3, 'active', ?4)",
        params![test_id, prompt_id, name, now],
    )?;

    for rev_id in &variant_revision_ids {
        let var_id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO ab_variants (id, test_id, revision_id, weight) VALUES (?1, ?2, ?3, ?4)",
            params![var_id, test_id, rev_id, weight],
        )?;
    }
    Ok(test_id)
}

#[tauri::command]
pub fn get_ab_tests(db: State<DbPool>, prompt_id: String) -> AppResult<Vec<serde_json::Value>> {
    let conn = db.lock();
    let mut stmt = conn.prepare(
        "SELECT id, name, status, created_at, ended_at FROM ab_tests WHERE prompt_id = ?1 ORDER BY created_at DESC",
    )?;
    let tests: Vec<(String, String, String, String, Option<String>)> = stmt
        .query_map(params![prompt_id], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)))?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let mut out = Vec::new();
    for (tid, name, status, created, ended) in tests {
        let mut vstmt = conn.prepare(
            "SELECT av.id, av.revision_id, r.revision_number, av.weight, av.impressions, av.successes
             FROM ab_variants av JOIN revisions r ON r.id = av.revision_id
             WHERE av.test_id = ?1",
        )?;
        let variants: Vec<serde_json::Value> = vstmt
            .query_map(params![tid], |r| {
                Ok(serde_json::json!({
                    "id": r.get::<_, String>(0)?,
                    "revision_id": r.get::<_, String>(1)?,
                    "revision_number": r.get::<_, i64>(2)?,
                    "weight": r.get::<_, f64>(3)?,
                    "impressions": r.get::<_, i64>(4)?,
                    "successes": r.get::<_, i64>(5)?,
                }))
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?;

        out.push(serde_json::json!({
            "id": tid, "name": name, "status": status,
            "created_at": created, "ended_at": ended,
            "variants": variants,
        }));
    }
    Ok(out)
}

#[tauri::command]
pub fn record_ab_impression(db: State<DbPool>, variant_id: String, success: bool) -> AppResult<()> {
    let conn = db.lock();
    if success {
        conn.execute(
            "UPDATE ab_variants SET impressions = impressions + 1, successes = successes + 1 WHERE id = ?1",
            params![variant_id],
        )?;
    } else {
        conn.execute(
            "UPDATE ab_variants SET impressions = impressions + 1 WHERE id = ?1",
            params![variant_id],
        )?;
    }
    Ok(())
}

// ---------- Tracing ----------

#[derive(Debug, Deserialize)]
pub struct SaveTraceInput {
    pub prompt_id: Option<String>,
    pub revision_id: Option<String>,
    pub provider: String,
    pub model: String,
    pub input_messages: String,
    pub output: String,
    pub input_tokens: Option<i64>,
    pub output_tokens: Option<i64>,
    pub latency_ms: Option<i64>,
    pub cost_usd: Option<f64>,
    pub status: Option<String>,
    pub error: Option<String>,
    pub metadata: Option<String>,
    /// Shared id across traces produced by a single multi-run or multi-provider
    /// click; lets Analytics and the tracing viewer group them (Epics 5 & 6).
    #[serde(default)]
    pub run_group_id: Option<String>,
    /// 'live' (default), 'manual' (user pasted), or 'imported'. See Epic 4.
    #[serde(default)]
    pub source: Option<String>,
}

#[tauri::command]
pub fn save_trace(db: State<DbPool>, input: SaveTraceInput) -> AppResult<String> {
    let conn = db.lock();
    let id = Uuid::new_v4().to_string();
    let now = now_string();
    conn.execute(
        "INSERT INTO traces (id, prompt_id, revision_id, provider, model, input_messages, output,
                             input_tokens, output_tokens, latency_ms, cost_usd, status, error,
                             metadata, run_group_id, source, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
        params![
            id, input.prompt_id, input.revision_id, input.provider, input.model,
            input.input_messages, input.output, input.input_tokens, input.output_tokens,
            input.latency_ms, input.cost_usd, input.status.unwrap_or_else(|| "success".into()),
            input.error, input.metadata, input.run_group_id,
            input.source.unwrap_or_else(|| "live".into()), now
        ],
    )?;
    Ok(id)
}

#[tauri::command]
pub fn list_traces(
    db: State<DbPool>,
    prompt_id: Option<String>,
    limit: Option<i64>,
) -> AppResult<Vec<serde_json::Value>> {
    let conn = db.lock();
    let lim = limit.unwrap_or(100);

    let (sql, param_val): (String, Option<String>) = if let Some(pid) = prompt_id {
        (
            "SELECT id, prompt_id, revision_id, provider, model, input_tokens, output_tokens,
                    latency_ms, cost_usd, status, error, created_at, run_group_id, source
             FROM traces WHERE prompt_id = ?1 ORDER BY created_at DESC LIMIT ?2".into(),
            Some(pid),
        )
    } else {
        (
            "SELECT id, prompt_id, revision_id, provider, model, input_tokens, output_tokens,
                    latency_ms, cost_usd, status, error, created_at, run_group_id, source
             FROM traces ORDER BY created_at DESC LIMIT ?1".into(),
            None,
        )
    };

    let mut out = Vec::new();
    if let Some(pid) = param_val {
        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query_map(params![pid, lim], |r| {
            Ok(serde_json::json!({
                "id": r.get::<_, String>(0)?,
                "prompt_id": r.get::<_, Option<String>>(1)?,
                "revision_id": r.get::<_, Option<String>>(2)?,
                "provider": r.get::<_, String>(3)?,
                "model": r.get::<_, String>(4)?,
                "input_tokens": r.get::<_, Option<i64>>(5)?,
                "output_tokens": r.get::<_, Option<i64>>(6)?,
                "latency_ms": r.get::<_, Option<i64>>(7)?,
                "cost_usd": r.get::<_, Option<f64>>(8)?,
                "status": r.get::<_, String>(9)?,
                "error": r.get::<_, Option<String>>(10)?,
                "created_at": r.get::<_, String>(11)?,
                "run_group_id": r.get::<_, Option<String>>(12)?,
                "source": r.get::<_, String>(13)?,
            }))
        })?;
        for r in rows { out.push(r?); }
    } else {
        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query_map(params![lim], |r| {
            Ok(serde_json::json!({
                "id": r.get::<_, String>(0)?,
                "prompt_id": r.get::<_, Option<String>>(1)?,
                "revision_id": r.get::<_, Option<String>>(2)?,
                "provider": r.get::<_, String>(3)?,
                "model": r.get::<_, String>(4)?,
                "input_tokens": r.get::<_, Option<i64>>(5)?,
                "output_tokens": r.get::<_, Option<i64>>(6)?,
                "latency_ms": r.get::<_, Option<i64>>(7)?,
                "cost_usd": r.get::<_, Option<f64>>(8)?,
                "status": r.get::<_, String>(9)?,
                "error": r.get::<_, Option<String>>(10)?,
                "created_at": r.get::<_, String>(11)?,
                "run_group_id": r.get::<_, Option<String>>(12)?,
                "source": r.get::<_, String>(13)?,
            }))
        })?;
        for r in rows { out.push(r?); }
    }
    Ok(out)
}

// ---------- Eval scores ----------

#[derive(Debug, Deserialize)]
pub struct SaveEvalScoreInput {
    pub revision_id: String,
    pub eval_name: String,
    pub score: f64,
    pub details: Option<String>,
    pub model: Option<String>,
}

#[tauri::command]
pub fn save_eval_score(db: State<DbPool>, input: SaveEvalScoreInput) -> AppResult<()> {
    let conn = db.lock();
    let id = Uuid::new_v4().to_string();
    let now = now_string();
    conn.execute(
        "INSERT INTO eval_scores (id, revision_id, eval_name, score, details, model, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, input.revision_id, input.eval_name, input.score, input.details, input.model, now],
    )?;
    Ok(())
}

#[tauri::command]
pub fn get_eval_scores(db: State<DbPool>, prompt_id: String) -> AppResult<Vec<serde_json::Value>> {
    let conn = db.lock();
    let mut stmt = conn.prepare(
        "SELECT es.id, es.revision_id, r.revision_number, es.eval_name, es.score,
                es.details, es.model, es.created_at
         FROM eval_scores es
         JOIN revisions r ON r.id = es.revision_id
         WHERE r.prompt_id = ?1
         ORDER BY r.revision_number ASC, es.eval_name ASC",
    )?;
    let rows = stmt.query_map(params![prompt_id], |row| {
        Ok(serde_json::json!({
            "id": row.get::<_, String>(0)?,
            "revision_id": row.get::<_, String>(1)?,
            "revision_number": row.get::<_, i64>(2)?,
            "eval_name": row.get::<_, String>(3)?,
            "score": row.get::<_, f64>(4)?,
            "details": row.get::<_, Option<String>>(5)?,
            "model": row.get::<_, Option<String>>(6)?,
            "created_at": row.get::<_, String>(7)?,
        }))
    })?;
    let mut out = Vec::new();
    for r in rows {
        out.push(r?);
    }
    Ok(out)
}

// ---------- Export ----------

#[derive(Debug, Deserialize)]
pub struct ExportInput {
    pub prompt_id: String,
    pub format: String, // "json" | "markdown"
    pub path: String,
}

#[tauri::command]
pub fn export_prompt_to_file(db: State<DbPool>, input: ExportInput) -> AppResult<()> {
    let conn = db.lock();
    let prompt: Prompt = conn.query_row(
        "SELECT id, folder_id, title, description, created_at, updated_at,
                view_prefs, git_workspace_id
         FROM prompts WHERE id = ?1",
        params![input.prompt_id],
        row_to_prompt,
    )?;

    let mut revs_stmt = conn.prepare(
        "SELECT id, prompt_id, revision_number, content, system_prompt, model,
                params, note, flagged, rating, created_at
         FROM revisions WHERE prompt_id = ?1
         ORDER BY revision_number ASC",
    )?;
    let revisions: Vec<Revision> = revs_stmt
        .query_map(params![input.prompt_id], row_to_revision)?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    let tags = load_tags(&conn, &input.prompt_id)?;

    // Load outputs for each revision
    let mut outputs_by_rev: std::collections::HashMap<String, Vec<RevisionOutput>> =
        std::collections::HashMap::new();
    for rev in &revisions {
        let mut stmt = conn.prepare(
            "SELECT id, revision_id, label, content, notes, rating, sort_order, created_at
             FROM revision_outputs WHERE revision_id = ?1 ORDER BY sort_order ASC",
        )?;
        let outs: Vec<RevisionOutput> = stmt
            .query_map(params![rev.id], row_to_output)?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        if !outs.is_empty() {
            outputs_by_rev.insert(rev.id.clone(), outs);
        }
    }

    let content = match input.format.as_str() {
        "json" => {
            #[derive(Serialize)]
            struct ExportJson {
                prompt: Prompt,
                tags: Vec<String>,
                revisions: Vec<Revision>,
                outputs: std::collections::HashMap<String, Vec<RevisionOutput>>,
            }
            serde_json::to_string_pretty(&ExportJson {
                prompt,
                tags,
                revisions,
                outputs: outputs_by_rev,
            })?
        }
        _ => {
            // Markdown format
            let mut md = String::new();
            md.push_str(&format!("# {}\n\n", prompt.title));
            if let Some(desc) = &prompt.description {
                md.push_str(&format!("_{}_\n\n", desc));
            }
            if !tags.is_empty() {
                md.push_str(&format!(
                    "Tags: {}\n\n",
                    tags.iter().map(|t| format!("`{}`", t)).collect::<Vec<_>>().join(", ")
                ));
            }
            md.push_str("---\n\n");

            for rev in &revisions {
                md.push_str(&format!(
                    "## Revisie #{}{}\n\n",
                    rev.revision_number,
                    if rev.flagged { " ⭐" } else { "" }
                ));
                if let Some(note) = &rev.note {
                    md.push_str(&format!("_Notitie: {}_\n\n", note));
                }
                if let Some(model) = &rev.model {
                    md.push_str(&format!("Model: `{}`\n\n", model));
                }
                if let Some(sp) = &rev.system_prompt {
                    md.push_str("### System prompt\n\n");
                    md.push_str(&format!("```\n{}\n```\n\n", sp));
                }
                md.push_str("### Prompt\n\n");
                md.push_str(&format!("{}\n\n", rev.content));

                if let Some(outs) = outputs_by_rev.get(&rev.id) {
                    for out in outs {
                        md.push_str(&format!(
                            "### Resultaat{}\n\n",
                            out.label
                                .as_ref()
                                .map(|l| format!(" ({})", l))
                                .unwrap_or_default()
                        ));
                        md.push_str(&format!("{}\n\n", out.content));
                        if let Some(notes) = &out.notes {
                            md.push_str(&format!("_Notitie: {}_\n\n", notes));
                        }
                    }
                }
                md.push_str("---\n\n");
            }
            md
        }
    };

    std::fs::write(&input.path, content)?;
    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct WriteTextFileInput {
    pub path: String,
    pub content: String,
}

/// Write arbitrary text content to a user-chosen path. Used by client-side
/// exporters (e.g. Results export) that format content in TypeScript and only
/// need a writer.
#[tauri::command]
pub fn write_text_file(input: WriteTextFileInput) -> AppResult<()> {
    std::fs::write(&input.path, input.content)?;
    Ok(())
}

// ---------- Reorder (drag-drop) ----------

#[derive(Debug, Deserialize)]
pub struct ReorderItem {
    pub id: String,
    pub sort_order: i64,
}

#[tauri::command]
pub fn reorder_folders(db: State<DbPool>, items: Vec<ReorderItem>) -> AppResult<()> {
    let conn = db.lock();
    for item in &items {
        conn.execute(
            "UPDATE folders SET sort_order = ?1 WHERE id = ?2",
            params![item.sort_order, item.id],
        )?;
    }
    Ok(())
}

#[tauri::command]
pub fn reorder_prompts(db: State<DbPool>, items: Vec<ReorderItem>) -> AppResult<()> {
    let conn = db.lock();
    for item in &items {
        conn.execute(
            "UPDATE prompts SET sort_order = ?1 WHERE id = ?2",
            params![item.sort_order, item.id],
        )?;
    }
    Ok(())
}

#[tauri::command]
pub fn move_prompt_to_folder(
    db: State<DbPool>,
    prompt_id: String,
    folder_id: String,
) -> AppResult<()> {
    let conn = db.lock();
    let now = now_string();
    // Set sort_order to end of new folder
    let next_order: i64 = conn.query_row(
        "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM prompts WHERE folder_id = ?1",
        params![folder_id],
        |r| r.get(0),
    )?;
    conn.execute(
        "UPDATE prompts SET folder_id = ?1, sort_order = ?2, updated_at = ?3 WHERE id = ?4",
        params![folder_id, next_order, now, prompt_id],
    )?;
    update_fts(&conn, &prompt_id)?;
    Ok(())
}

// ---------- Secure key storage (OS keychain) ----------

#[tauri::command]
pub fn keychain_set(service: String, key: String, value: String) -> AppResult<()> {
    let entry = keyring::Entry::new(&service, &key)
        .map_err(|e| AppError::Internal(format!("keychain init: {e}")))?;
    entry
        .set_password(&value)
        .map_err(|e| AppError::Internal(format!("keychain set: {e}")))?;
    Ok(())
}

#[tauri::command]
pub fn keychain_get(service: String, key: String) -> AppResult<Option<String>> {
    let entry = keyring::Entry::new(&service, &key)
        .map_err(|e| AppError::Internal(format!("keychain init: {e}")))?;
    match entry.get_password() {
        Ok(pw) => Ok(Some(pw)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(AppError::Internal(format!("keychain get: {e}"))),
    }
}

#[tauri::command]
pub fn keychain_delete(service: String, key: String) -> AppResult<()> {
    let entry = keyring::Entry::new(&service, &key)
        .map_err(|e| AppError::Internal(format!("keychain init: {e}")))?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()), // already gone
        Err(e) => Err(AppError::Internal(format!("keychain delete: {e}"))),
    }
}

// ---------- Settings ----------

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub mode: String,             // "basic" | "advanced" | "engineer" | "custom"
    pub custom_features: serde_json::Value,
    pub airgap_enabled: bool,
    pub first_run_completed: bool,
    pub theme: String,            // "light" | "dark"
}

#[tauri::command]
pub fn get_settings(db: State<DbPool>) -> AppResult<AppSettings> {
    let conn = db.lock();
    let mut stmt = conn.prepare("SELECT key, value FROM app_settings")?;
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    })?;

    let mut mode = "basic".to_string();
    let mut custom_features = serde_json::json!({
        "showVariables": true,
        "showPlayground": true,
        "showSystemPrompt": true,
        "showMetadata": true,
        "showResults": true,
        "showBatchEvals": true
    });
    let mut airgap_enabled = true;
    let mut first_run_completed = false;
    let mut theme = "light".to_string();

    for r in rows {
        let (k, v) = r?;
        let parsed: serde_json::Value = serde_json::from_str(&v).unwrap_or(serde_json::Value::Null);
        match k.as_str() {
            "mode" => {
                if let Some(s) = parsed.as_str() {
                    mode = s.to_string();
                }
            }
            "custom_features" => {
                custom_features = parsed;
            }
            "airgap_enabled" => {
                if let Some(b) = parsed.as_bool() {
                    airgap_enabled = b;
                }
            }
            "first_run_completed" => {
                if let Some(b) = parsed.as_bool() {
                    first_run_completed = b;
                }
            }
            "theme" => {
                if let Some(s) = parsed.as_str() {
                    theme = s.to_string();
                }
            }
            _ => {}
        }
    }
    Ok(AppSettings {
        mode,
        custom_features,
        airgap_enabled,
        first_run_completed,
        theme,
    })
}

#[derive(Debug, Deserialize)]
pub struct UpdateSettingsInput {
    pub mode: Option<String>,
    pub custom_features: Option<serde_json::Value>,
    pub airgap_enabled: Option<bool>,
    pub first_run_completed: Option<bool>,
    pub theme: Option<String>,
}

#[tauri::command]
pub fn update_settings(db: State<DbPool>, input: UpdateSettingsInput) -> AppResult<AppSettings> {
    {
        let conn = db.lock();
        if let Some(mode) = &input.mode {
            let val = serde_json::to_string(mode)?;
            conn.execute(
                "INSERT INTO app_settings (key, value) VALUES ('mode', ?1)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                params![val],
            )?;
        }
        if let Some(custom) = &input.custom_features {
            let val = serde_json::to_string(custom)?;
            conn.execute(
                "INSERT INTO app_settings (key, value) VALUES ('custom_features', ?1)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                params![val],
            )?;
        }
        if let Some(airgap) = input.airgap_enabled {
            let val = serde_json::to_string(&airgap)?;
            conn.execute(
                "INSERT INTO app_settings (key, value) VALUES ('airgap_enabled', ?1)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                params![val],
            )?;
        }
        if let Some(first) = input.first_run_completed {
            let val = serde_json::to_string(&first)?;
            conn.execute(
                "INSERT INTO app_settings (key, value) VALUES ('first_run_completed', ?1)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                params![val],
            )?;
        }
        if let Some(theme) = &input.theme {
            let val = serde_json::to_string(theme)?;
            conn.execute(
                "INSERT INTO app_settings (key, value) VALUES ('theme', ?1)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                params![val],
            )?;
        }
    }
    get_settings(db)
}
