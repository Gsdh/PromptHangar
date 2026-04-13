-- PromptHangar — initial schema (v0.1)

CREATE TABLE folders (
    id TEXT PRIMARY KEY,
    parent_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    sensitive INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE INDEX idx_folders_parent ON folders(parent_id);

CREATE TABLE prompts (
    id TEXT PRIMARY KEY,
    folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_prompts_folder ON prompts(folder_id);

CREATE TABLE revisions (
    id TEXT PRIMARY KEY,
    prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    system_prompt TEXT,
    model TEXT,
    params TEXT NOT NULL DEFAULT '{}',
    note TEXT,
    flagged INTEGER NOT NULL DEFAULT 0,
    rating INTEGER,
    created_at TEXT NOT NULL,
    UNIQUE(prompt_id, revision_number)
);

CREATE INDEX idx_revisions_prompt ON revisions(prompt_id);
CREATE INDEX idx_revisions_created ON revisions(created_at);

-- Full-text search over prompts + latest revision content
CREATE VIRTUAL TABLE prompts_fts USING fts5(
    prompt_id UNINDEXED,
    title,
    description,
    latest_content,
    tokenize='porter unicode61'
);

-- Simple key/value store for app settings
CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT INTO app_settings (key, value) VALUES
    ('mode', '"basic"'),
    ('airgap_enabled', 'true'),
    ('first_run_completed', 'false'),
    ('theme', '"dark"');
