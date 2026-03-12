-- Migration: Add is_okr column and indexes for filter performance
-- Date: 2025-01-XX

-- Add is_okr column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_okr BOOLEAN DEFAULT false;

-- Add indexes on all filter columns for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_performance ON tasks(performance);
CREATE INDEX IF NOT EXISTS idx_tasks_is_okr ON tasks(is_okr);

-- Add index on name for search functionality (using lower() for case-insensitive search)
CREATE INDEX IF NOT EXISTS idx_tasks_name_lower ON tasks(LOWER(name));

-- Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_tasks_quarter_status ON tasks(quarter_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_quarter_priority ON tasks(quarter_id, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_quarter_category ON tasks(quarter_id, category);
CREATE INDEX IF NOT EXISTS idx_tasks_quarter_is_okr ON tasks(quarter_id, is_okr);
CREATE INDEX IF NOT EXISTS idx_tasks_owner_status ON tasks(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_owner_priority ON tasks(owner_id, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_owner_category ON tasks(owner_id, category);
CREATE INDEX IF NOT EXISTS idx_tasks_owner_is_okr ON tasks(owner_id, is_okr);
CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_category_priority ON tasks(category, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_performance_status ON tasks(performance, status);

-- Index for overdue tasks (due_date with status filter)
CREATE INDEX IF NOT EXISTS idx_tasks_due_date_status ON tasks(due_date, status) WHERE due_date IS NOT NULL;
