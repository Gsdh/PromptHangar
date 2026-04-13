-- Eval scores per revision: stores results from batch eval runs.
-- Used for regression detection: comparing scores between revisions.

CREATE TABLE eval_scores (
    id TEXT PRIMARY KEY,
    revision_id TEXT NOT NULL REFERENCES revisions(id) ON DELETE CASCADE,
    eval_name TEXT NOT NULL,
    score REAL NOT NULL,
    details TEXT,
    model TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX idx_eval_scores_rev ON eval_scores(revision_id);
CREATE INDEX idx_eval_scores_name ON eval_scores(eval_name);
