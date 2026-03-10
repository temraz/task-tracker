-- Migration: Add password field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255) UNIQUE;

-- Create index for username
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
