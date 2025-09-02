-- Create services table
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    price_type VARCHAR(10) NOT NULL CHECK (price_type IN ('FIXED', 'HOURLY')),
    budget_hours DECIMAL(10,2) DEFAULT 0,
    fixed_price DECIMAL(10,2),
    hourly_rate DECIMAL(10,2),
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add service_id column to time_entries table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='time_entries' AND column_name='service_id') THEN
        ALTER TABLE time_entries ADD COLUMN service_id INTEGER REFERENCES services(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_services_project_id ON services(project_id);
CREATE INDEX IF NOT EXISTS idx_services_company_id ON services(company_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_service_id ON time_entries(service_id);

-- Add some sample services for testing (optional)
INSERT INTO services (project_id, name, price_type, budget_hours, hourly_rate) 
SELECT 
    p.id,
    'Development' as name,
    'HOURLY' as price_type,
    100.0 as budget_hours,
    75.0 as hourly_rate
FROM projects p
WHERE NOT EXISTS (SELECT 1 FROM services s WHERE s.project_id = p.id AND s.name = 'Development')
LIMIT 1;

INSERT INTO services (project_id, name, price_type, budget_hours, hourly_rate) 
SELECT 
    p.id,
    'Design' as name,
    'HOURLY' as price_type,
    50.0 as budget_hours,
    65.0 as hourly_rate
FROM projects p
WHERE NOT EXISTS (SELECT 1 FROM services s WHERE s.project_id = p.id AND s.name = 'Design')
LIMIT 1; 