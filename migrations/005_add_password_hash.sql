-- Migration: Add password_hash column to users table
-- This migration adds support for custom authentication (replacing Supabase Auth)

-- Add password_hash column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Add index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Add index on password_hash to help with queries (though we'll filter by email first)
-- Note: This index is optional and can be removed if not needed

-- Update comment for users table
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password for custom authentication';

