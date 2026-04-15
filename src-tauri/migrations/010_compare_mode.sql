-- Compare mode (Epic 7).
--
-- Adds a "baseline" and "champion" concept at the prompt level:
--   * `baseline_revision_id` — the revision a user pins as their
--     reference. Head-to-head runs re-run this revision alongside
--     the current draft so users can see metric deltas.
--   * `champion_revision_id` — the revision marked as the winner
--     (usually the best-performing one). Surfaces as a trophy badge
--     in the prompt list and the timeline.
--
-- Both are optional and nullable; deleting the referenced revision
-- sets the pointer back to NULL rather than cascading.

ALTER TABLE prompts ADD COLUMN baseline_revision_id TEXT
    REFERENCES revisions(id) ON DELETE SET NULL;
ALTER TABLE prompts ADD COLUMN champion_revision_id TEXT
    REFERENCES revisions(id) ON DELETE SET NULL;

CREATE INDEX idx_prompts_baseline ON prompts(baseline_revision_id);
CREATE INDEX idx_prompts_champion ON prompts(champion_revision_id);

-- When the user fires a "Run comparison" click we stamp both sides'
-- traces with a shared `comparison_id` so the Comparison modal can
-- fetch them as a single unit. `comparison_side` flags which side
-- ('baseline' vs 'candidate') so we can render them in the right
-- column without another lookup.
ALTER TABLE traces ADD COLUMN comparison_id TEXT;
ALTER TABLE traces ADD COLUMN comparison_side TEXT;
-- Values: 'baseline' | 'candidate' — NULL for non-comparison runs.

CREATE INDEX idx_traces_comparison ON traces(comparison_id);
