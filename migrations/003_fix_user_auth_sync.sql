-- Fix user authentication sync migration
-- This migration updates the users table to use Supabase Auth user IDs as primary keys

-- First, let's create a backup of the current users table
CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users;

-- Drop existing foreign key constraints that reference users.id
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_recruiter_id_fkey;
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_user_id_fkey;
ALTER TABLE resumes DROP CONSTRAINT IF EXISTS resumes_user_id_fkey;
ALTER TABLE interviews DROP CONSTRAINT IF EXISTS interviews_interviewer_id_fkey;
ALTER TABLE chat_history DROP CONSTRAINT IF EXISTS chat_history_user_id_fkey;
ALTER TABLE files DROP CONSTRAINT IF EXISTS files_user_id_fkey;
ALTER TABLE pro_signups DROP CONSTRAINT IF EXISTS pro_signups_user_id_fkey;

-- Drop the existing users table
DROP TABLE IF EXISTS users;

-- Recreate the users table with auth.uid() as the primary key
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY, -- This will be the Supabase Auth user ID
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'applicant' CHECK (role IN ('applicant', 'recruiter', 'admin')),
    avatar_url TEXT,
    is_pro BOOLEAN DEFAULT FALSE,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recreate foreign key constraints
ALTER TABLE jobs ADD CONSTRAINT jobs_recruiter_id_fkey 
    FOREIGN KEY (recruiter_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE candidates ADD CONSTRAINT candidates_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE resumes ADD CONSTRAINT resumes_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE interviews ADD CONSTRAINT interviews_interviewer_id_fkey 
    FOREIGN KEY (interviewer_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE chat_history ADD CONSTRAINT chat_history_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE files ADD CONSTRAINT files_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE pro_signups ADD CONSTRAINT pro_signups_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

-- Create trigger for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Allow insert during registration (will be handled by trigger)
CREATE POLICY "Allow user registration" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Create a function to automatically create user profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, first_name, last_name, role, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'applicant'),
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Note: If you have existing users in auth.users but not in public.users,
-- you can run this query to sync them:
-- INSERT INTO public.users (id, email, created_at, updated_at)
-- SELECT id, email, created_at, updated_at FROM auth.users
-- WHERE id NOT IN (SELECT id FROM public.users); 