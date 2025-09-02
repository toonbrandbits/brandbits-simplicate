-- Add unlimited_hours column to project_companies table
ALTER TABLE project_companies 
ADD COLUMN unlimited_hours BOOLEAN DEFAULT FALSE;

-- Update existing records to have unlimited_hours = false
UPDATE project_companies 
SET unlimited_hours = FALSE 
WHERE unlimited_hours IS NULL;

-- Make unlimited_hours NOT NULL
ALTER TABLE project_companies 
ALTER COLUMN unlimited_hours SET NOT NULL;

-- Add constraint to ensure either available_hours is set OR unlimited_hours is true
ALTER TABLE project_companies 
ADD CONSTRAINT check_hours_or_unlimited 
CHECK (
    (available_hours IS NOT NULL AND unlimited_hours = FALSE) OR 
    (available_hours IS NULL AND unlimited_hours = TRUE)
);
