-- Fix user authentication sync migration
-- NOTE: This migration is Supabase-specific and not needed for custom auth
-- We're keeping it for reference but it will be skipped
-- All RLS policies and auth triggers are removed since we use custom auth

-- This migration is intentionally empty for non-Supabase deployments
-- The users table structure is already correct from migration 001

-- Create trigger for users updated_at (if function exists and trigger doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') 
       AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Note: RLS and auth triggers removed - using custom JWT authentication instead
