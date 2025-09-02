-- Manual migration: Add updated_at column to services table
-- Run this SQL directly in your database if needed

-- Add updated_at column if it doesn't exist
ALTER TABLE services ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Update existing records to have updated_at = created_at
UPDATE services SET updated_at = created_at WHERE updated_at IS NULL; 