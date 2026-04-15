-- Shared foundation for multi-run (Epic 5), multi-provider fan-out (Epic 6),
-- first-class manual runs (Epic 4), and color-coded revisions (Epic 3).

-- Group a batch of outputs that belong to one "Run N" or "Run across M models"
-- click. Lets us render them together and bulk-delete/re-run.
ALTER TABLE revision_outputs ADD COLUMN run_group_id TEXT;
CREATE INDEX idx_revision_outputs_group ON revision_outputs(run_group_id);

-- Same idea on traces, so Analytics can show one fan-out / multi-run as a
-- single line item with per-model breakdown.
ALTER TABLE traces ADD COLUMN run_group_id TEXT;
CREATE INDEX idx_traces_group ON traces(run_group_id);

-- Distinguish live provider runs from user-entered runs (claude.ai web,
-- a colleague's output pasted in, etc.). Default 'live' keeps back-compat.
ALTER TABLE traces ADD COLUMN source TEXT NOT NULL DEFAULT 'live';
-- Values: 'live' | 'manual' | 'imported'

-- Per-prompt view preferences as a JSON blob: { "colorBy": "rating" } etc.
-- A blob rather than columns because we'll add more view state over time
-- and don't want a migration per toggle.
ALTER TABLE prompts ADD COLUMN view_prefs TEXT;
