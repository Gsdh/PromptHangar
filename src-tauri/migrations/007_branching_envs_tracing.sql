-- Git-style branching: revisions can now have a parent_revision_id
-- to form a tree instead of a linear list.
ALTER TABLE revisions ADD COLUMN parent_revision_id TEXT REFERENCES revisions(id);
ALTER TABLE revisions ADD COLUMN branch_name TEXT DEFAULT 'main';

CREATE INDEX idx_revisions_branch ON revisions(prompt_id, branch_name);

-- Environment management: each revision can be promoted to an environment.
CREATE TABLE environments (
    id TEXT PRIMARY KEY,
    prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    env_name TEXT NOT NULL,
    revision_id TEXT NOT NULL REFERENCES revisions(id) ON DELETE CASCADE,
    promoted_at TEXT NOT NULL,
    promoted_by TEXT,
    UNIQUE(prompt_id, env_name)
);

-- A/B testing: define experiments that split between revision variants.
CREATE TABLE ab_tests (
    id TEXT PRIMARY KEY,
    prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    ended_at TEXT
);

CREATE TABLE ab_variants (
    id TEXT PRIMARY KEY,
    test_id TEXT NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    revision_id TEXT NOT NULL REFERENCES revisions(id) ON DELETE CASCADE,
    weight REAL NOT NULL DEFAULT 0.5,
    impressions INTEGER NOT NULL DEFAULT 0,
    successes INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_ab_variants_test ON ab_variants(test_id);

-- Tracing: log every LLM API call with full request/response context.
CREATE TABLE traces (
    id TEXT PRIMARY KEY,
    prompt_id TEXT REFERENCES prompts(id) ON DELETE SET NULL,
    revision_id TEXT REFERENCES revisions(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    input_messages TEXT NOT NULL,
    output TEXT NOT NULL,
    input_tokens INTEGER,
    output_tokens INTEGER,
    latency_ms INTEGER,
    cost_usd REAL,
    status TEXT NOT NULL DEFAULT 'success',
    error TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX idx_traces_prompt ON traces(prompt_id);
CREATE INDEX idx_traces_created ON traces(created_at);
CREATE INDEX idx_traces_model ON traces(model);
