-- Add missing fields to files table
-- This migration adds the category and file_url fields that the code expects

-- Add category field to files table
ALTER TABLE files ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general';

-- Add file_url field to files table
ALTER TABLE files ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_files_category ON files(category);

-- Create index for user_id and category combination for better query performance
CREATE INDEX IF NOT EXISTS idx_files_user_category ON files(user_id, category);

-- Update existing files to have a default category if they don't have one
UPDATE files SET category = 'general' WHERE category IS NULL; 