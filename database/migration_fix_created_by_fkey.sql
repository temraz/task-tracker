-- Migration: Fix created_by foreign key to allow user deletion
-- This migration updates the tasks.created_by foreign key constraint
-- to SET NULL on delete, similar to owner_id

-- First, drop the existing foreign key constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;

-- Re-add the constraint with ON DELETE SET NULL
ALTER TABLE tasks 
  ADD CONSTRAINT tasks_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES users(id) 
  ON DELETE SET NULL;
