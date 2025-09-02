-- Migration: Add updated_at column to services table
-- This script adds the updated_at column to existing services tables

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='services' AND column_name='updated_at') THEN
        ALTER TABLE services ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Update existing records to have updated_at = created_at
UPDATE services SET updated_at = created_at WHERE updated_at IS NULL; 