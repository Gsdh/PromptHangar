-- Prompt chains: link prompts as steps in a pipeline.
-- A chain is a named sequence; chain_steps defines the order.

CREATE TABLE chains (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE chain_steps (
    id TEXT PRIMARY KEY,
    chain_id TEXT NOT NULL REFERENCES chains(id) ON DELETE CASCADE,
    prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    transform TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX idx_chain_steps_chain ON chain_steps(chain_id, step_order);
