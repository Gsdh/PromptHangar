use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Folder {
    pub id: String,
    pub parent_id: Option<String>,
    pub name: String,
    pub color: Option<String>,
    pub icon: Option<String>,
    pub sort_order: i64,
    pub sensitive: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Prompt {
    pub id: String,
    pub folder_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    /// JSON blob for UI view preferences (color-by, etc.). `null` if unset.
    #[serde(default)]
    pub view_prefs: Option<serde_json::Value>,
    /// Linked Git workspace, if any (Epic 2).
    #[serde(default)]
    pub git_workspace_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Revision {
    pub id: String,
    pub prompt_id: String,
    pub revision_number: i64,
    pub content: String,
    pub system_prompt: Option<String>,
    pub model: Option<String>,
    pub params: serde_json::Value,
    pub note: Option<String>,
    pub flagged: bool,
    pub rating: Option<i64>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RevisionOutput {
    pub id: String,
    pub revision_id: String,
    pub label: Option<String>,
    pub content: String,
    pub notes: Option<String>,
    pub rating: Option<i64>,
    pub sort_order: i64,
    pub created_at: DateTime<Utc>,
    /// All outputs produced by a single multi-run / multi-provider click
    /// share the same `run_group_id`, so they can be rendered together
    /// and bulk-operated on.
    #[serde(default)]
    pub run_group_id: Option<String>,
}

/// A local Git repository the user has linked for prompt sync (Epic 2).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitWorkspace {
    pub id: String,
    pub name: String,
    pub path: String,
    pub push_policy: String, // "manual" | "on_commit" | "interval"
    pub push_interval_seconds: Option<i64>,
    pub default_remote: String,
    pub default_branch: String,
    pub last_push_at: Option<String>,
    pub last_pull_at: Option<String>,
    pub last_error: Option<String>,
    pub created_at: String,
}

/// Full prompt view: prompt + latest revision + tags (for list displays)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PromptWithLatest {
    pub prompt: Prompt,
    pub latest_revision: Option<Revision>,
    pub revision_count: i64,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Chain {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub folder_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChainStep {
    pub id: String,
    pub chain_id: String,
    pub prompt_id: String,
    pub prompt_title: Option<String>,
    pub step_order: i64,
    pub transform: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChainWithSteps {
    pub chain: Chain,
    pub steps: Vec<ChainStep>,
}

/// Search result row
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchHit {
    pub prompt_id: String,
    pub title: String,
    pub description: Option<String>,
    pub snippet: String,
    pub folder_id: Option<String>,
}
