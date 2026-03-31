-- Idempotent bootstrap migration to ensure critical columns exist
-- Safe to run multiple times

-- Users: add password and username for local auth
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE;

-- Index for username
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Tasks: add is_okr; start as BOOLEAN for compatibility
ALTER TABLE IF EXISTS tasks ADD COLUMN IF NOT EXISTS is_okr BOOLEAN DEFAULT false;

-- If app expects INTEGER, convert (boolean -> integer)
DO $$
BEGIN
  -- Check column type; convert only if boolean
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'is_okr' AND data_type = 'boolean'
  ) THEN
    ALTER TABLE tasks ALTER COLUMN is_okr TYPE INTEGER USING CASE WHEN is_okr = true THEN 1 ELSE 0 END;
    ALTER TABLE tasks ALTER COLUMN is_okr SET DEFAULT 0;
  END IF;
END $$;

