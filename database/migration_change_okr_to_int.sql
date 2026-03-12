-- Migration: Change is_okr from BOOLEAN to INTEGER (0/1)
-- Date: 2026-03-12

-- Drop existing indexes on is_okr
DROP INDEX IF EXISTS idx_tasks_is_okr;
DROP INDEX IF EXISTS idx_tasks_quarter_is_okr;
DROP INDEX IF EXISTS idx_tasks_owner_is_okr;

-- Change column type from BOOLEAN to INTEGER
ALTER TABLE tasks ALTER COLUMN is_okr TYPE INTEGER USING CASE WHEN is_okr = true THEN 1 ELSE 0 END;

-- Set default to 0
ALTER TABLE tasks ALTER COLUMN is_okr SET DEFAULT 0;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_tasks_is_okr ON tasks(is_okr);
CREATE INDEX IF NOT EXISTS idx_tasks_quarter_is_okr ON tasks(quarter_id, is_okr);
CREATE INDEX IF NOT EXISTS idx_tasks_owner_is_okr ON tasks(owner_id, is_okr);
