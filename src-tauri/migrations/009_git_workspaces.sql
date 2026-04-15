-- Git sync foundation (Epic 2).
-- A workspace is a local Git repository the user nominates to mirror
-- prompts and their revision history. Multiple workspaces allowed; each
-- prompt can be linked to at most one.

CREATE TABLE git_workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    push_policy TEXT NOT NULL DEFAULT 'manual',
    -- 'manual' | 'on_commit' | 'interval'
    push_interval_seconds INTEGER,
    default_remote TEXT NOT NULL DEFAULT 'origin',
    default_branch TEXT NOT NULL DEFAULT 'main',
    last_push_at TEXT,
    last_pull_at TEXT,
    last_error TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX idx_git_workspaces_path ON git_workspaces(path);

-- Prompts can opt in to sync by linking to a workspace. Revision history
-- and the latest content are written to a file under the workspace on save.
ALTER TABLE prompts ADD COLUMN git_workspace_id TEXT
    REFERENCES git_workspaces(id) ON DELETE SET NULL;

CREATE INDEX idx_prompts_git_workspace ON prompts(git_workspace_id);
