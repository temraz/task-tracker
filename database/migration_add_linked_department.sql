-- Adds linked_department to tasks table (idempotent)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS linked_department VARCHAR(255);

-- Optional index to speed up filtering by department
CREATE INDEX IF NOT EXISTS idx_tasks_linked_department ON tasks(linked_department);

