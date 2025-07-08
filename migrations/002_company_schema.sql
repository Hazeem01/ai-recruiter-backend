-- Company schema migration
-- This migration adds company support for recruiters

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    website VARCHAR(255),
    logo_url TEXT,
    industry VARCHAR(100),
    size VARCHAR(50) CHECK (size IN ('startup', 'small', 'medium', 'large', 'enterprise')),
    location VARCHAR(255),
    founded_year INTEGER,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add company_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE SET NULL;

-- Add company_id to jobs table (replacing the company VARCHAR field)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Create indexes for company-related queries
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);

-- Create trigger for companies updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS (Row Level Security) policies for companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view companies
CREATE POLICY "Users can view companies" ON companies
    FOR SELECT USING (true);

-- Policy: Company members can update their company
CREATE POLICY "Company members can update company" ON companies
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.company_id = companies.id 
            AND users.id = auth.uid()
        )
    );

-- Policy: Only authenticated users can create companies
CREATE POLICY "Authenticated users can create companies" ON companies
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Update jobs table to use company_id instead of company VARCHAR
-- This is a data migration that should be run after the schema is updated
-- For existing data, you may want to create companies based on the existing company names

-- Function to migrate existing company names to company records
CREATE OR REPLACE FUNCTION migrate_companies()
RETURNS void AS $$
DECLARE
    job_record RECORD;
    company_record RECORD;
BEGIN
    -- Loop through jobs with company names that don't have company_id
    FOR job_record IN 
        SELECT DISTINCT company 
        FROM jobs 
        WHERE company_id IS NULL AND company IS NOT NULL
    LOOP
        -- Check if company already exists
        SELECT id INTO company_record 
        FROM companies 
        WHERE name = job_record.company;
        
        -- If company doesn't exist, create it
        IF company_record.id IS NULL THEN
            INSERT INTO companies (name, created_at, updated_at)
            VALUES (job_record.company, NOW(), NOW())
            RETURNING id INTO company_record;
        END IF;
        
        -- Update jobs to reference the company
        UPDATE jobs 
        SET company_id = company_record.id 
        WHERE company = job_record.company AND company_id IS NULL;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Note: Run this function after the migration to migrate existing data
-- SELECT migrate_companies(); 