-- Add sort_order to prompts so drag-and-drop reorder works.
ALTER TABLE prompts ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
