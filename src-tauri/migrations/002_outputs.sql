-- Revision outputs: manual (for now) results pasted by the user.
-- Each output belongs to a specific revision, so users can see which
-- version of the prompt produced which output.

CREATE TABLE revision_outputs (
    id TEXT PRIMARY KEY,
    revision_id TEXT NOT NULL REFERENCES revisions(id) ON DELETE CASCADE,
    label TEXT,
    content TEXT NOT NULL,
    notes TEXT,
    rating INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE INDEX idx_revision_outputs_rev ON revision_outputs(revision_id);
CREATE INDEX idx_revision_outputs_order ON revision_outputs(revision_id, sort_order);
