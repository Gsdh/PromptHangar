-- Epic 10 — optional master password for app-level lock.
--
-- One-row key/value table. Using a fixed sentinel id (1) keeps the schema
-- trivial and avoids having to track "which row is current" — there is
-- only ever one password on this machine, or none.

CREATE TABLE IF NOT EXISTS app_security (
    id               INTEGER PRIMARY KEY CHECK (id = 1),
    password_phc     TEXT,      -- Argon2id PHC-string: "$argon2id$v=19$m=19456,t=2,p=1$..."
    lock_timeout_min INTEGER NOT NULL DEFAULT 15,   -- idle minutes before auto-lock; 0 disables
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
);

-- Seed the single row so later code can do plain UPDATEs.
INSERT OR IGNORE INTO app_security (id, password_phc, lock_timeout_min, created_at, updated_at)
VALUES (1, NULL, 15, datetime('now'), datetime('now'));
