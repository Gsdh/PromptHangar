-- Tags are many-to-one with prompts. Tag text is canonical:
-- applications should lowercase/trim before inserting.

CREATE TABLE prompt_tags (
    prompt_id TEXT NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    tag TEXT NOT NULL,
    PRIMARY KEY (prompt_id, tag)
);

CREATE INDEX idx_prompt_tags_tag ON prompt_tags(tag);
