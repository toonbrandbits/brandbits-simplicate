-- TimeFlow Database Initialization Script
-- This script creates all the required tables for the TimeFlow application

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    visit_address TEXT,
    contact_details JSONB DEFAULT '{}',
    company_size VARCHAR(100),
    branch VARCHAR(255),
    relatie_beheerder VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create employees table
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create project_companies junction table
CREATE TABLE IF NOT EXISTS project_companies (
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    available_hours DECIMAL(10,2) DEFAULT 0 CHECK (available_hours >= 0),
    unlimited_hours BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (project_id, company_id)
);

-- Add constraint to ensure either available_hours is set OR unlimited_hours is true
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'check_hours_or_unlimited'
    ) THEN
        ALTER TABLE project_companies 
        ADD CONSTRAINT check_hours_or_unlimited 
        CHECK (
            (available_hours IS NOT NULL AND unlimited_hours = FALSE) OR 
            (available_hours IS NULL AND unlimited_hours = TRUE)
        );
    END IF;
END $$;

-- Create time_entries table
CREATE TABLE IF NOT EXISTS time_entries (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    hours_worked DECIMAL(5,2) NOT NULL CHECK (hours_worked >= 0 AND hours_worked <= 24),
    start_time TIME,
    end_time TIME,
    service_id INTEGER, -- Will be referenced by services table
    comment TEXT, -- Comment field for time entries
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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
    service_color VARCHAR(7), -- Hex color code for service identification
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint for service_id in time_entries
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_time_entries_service_id'
    ) THEN
        ALTER TABLE time_entries 
        ADD CONSTRAINT fk_time_entries_service_id 
        FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(company_name);
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(project_name);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_date ON time_entries(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_time_entries_company_project ON time_entries(company_id, project_id);
CREATE INDEX IF NOT EXISTS idx_project_companies_project ON project_companies(project_id);
CREATE INDEX IF NOT EXISTS idx_project_companies_company ON project_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_services_project_id ON services(project_id);
CREATE INDEX IF NOT EXISTS idx_services_company_id ON services(company_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_service_id ON time_entries(service_id);

-- Insert comprehensive sample data for testing

-- Insert companies
INSERT INTO companies (company_name, visit_address, contact_details, company_size, branch, relatie_beheerder) 
VALUES 
    ('Acme Corp', '123 Business St, Amsterdam', '{"phone": "+31 20 123 4567", "email": "contact@acme.com"}', '50-100', 'Technology', 'Rik Mulder'),
    ('TechStart BV', '456 Innovation Ave, Rotterdam', '{"phone": "+31 10 987 6543", "email": "hello@techstart.nl"}', '10-50', 'Technology', 'Stijn Cornel'),
    ('Brandbits', '789 Creative Lane, Utrecht', '{"phone": "+31 30 555 1234", "email": "info@brandbits.nl"}', '5-10', 'Design & Development', 'Brand Manager'),
    ('Digital Solutions', '321 Tech Park, Eindhoven', '{"phone": "+31 40 777 8888", "email": "hello@digitalsolutions.nl"}', '25-50', 'Technology', 'Project Manager')
ON CONFLICT DO NOTHING;

-- Insert projects (including unlimited hours project for Brandbits)
INSERT INTO projects (project_name, description) 
VALUES 
    ('Website Redesign', 'Complete redesign of the company website with modern UI/UX'),
    ('Mobile App Development', 'Development of a new mobile application for iOS and Android'),
    ('Brandbits Internal', 'Internal development and maintenance for Brandbits company'),
    ('E-commerce Platform', 'Full e-commerce solution with payment integration'),
    ('Marketing Website', 'Corporate marketing website with CMS')
ON CONFLICT DO NOTHING;

-- Insert employees
INSERT INTO employees (name, email) 
VALUES 
    ('John Doe', 'john.doe@company.com'),
    ('Jane Smith', 'jane.smith@company.com'),
    ('Bob Johnson', 'bob.johnson@company.com'),
    ('Alice Brown', 'alice.brown@company.com'),
    ('Charlie Wilson', 'charlie.wilson@company.com')
ON CONFLICT DO NOTHING;

-- Link projects to companies with available hours (including unlimited hours)
INSERT INTO project_companies (project_id, company_id, available_hours, unlimited_hours)
SELECT p.id, c.id, 100.0, FALSE
FROM projects p, companies c
WHERE p.project_name = 'Website Redesign' AND c.company_name = 'Acme Corp'
ON CONFLICT DO NOTHING;

INSERT INTO project_companies (project_id, company_id, available_hours, unlimited_hours)
SELECT p.id, c.id, 150.0, FALSE
FROM projects p, companies c
WHERE p.project_name = 'Mobile App Development' AND c.company_name = 'TechStart BV'
ON CONFLICT DO NOTHING;

-- Brandbits internal project with unlimited hours
INSERT INTO project_companies (project_id, company_id, available_hours, unlimited_hours)
SELECT p.id, c.id, NULL, TRUE
FROM projects p, companies c
WHERE p.project_name = 'Brandbits Internal' AND c.company_name = 'Brandbits'
ON CONFLICT DO NOTHING;

INSERT INTO project_companies (project_id, company_id, available_hours, unlimited_hours)
SELECT p.id, c.id, 200.0, FALSE
FROM projects p, companies c
WHERE p.project_name = 'E-commerce Platform' AND c.company_name = 'Digital Solutions'
ON CONFLICT DO NOTHING;

INSERT INTO project_companies (project_id, company_id, available_hours, unlimited_hours)
SELECT p.id, c.id, 80.0, FALSE
FROM projects p, companies c
WHERE p.project_name = 'Marketing Website' AND c.company_name = 'Acme Corp'
ON CONFLICT DO NOTHING;

-- Insert comprehensive services with colors
INSERT INTO services (project_id, name, price_type, budget_hours, hourly_rate, service_color)
SELECT p.id, 'Development', 'HOURLY', 100.0, 75.0, '#3b82f6'
FROM projects p
WHERE p.project_name = 'Website Redesign'
ON CONFLICT DO NOTHING;

INSERT INTO services (project_id, name, price_type, budget_hours, hourly_rate, service_color)
SELECT p.id, 'Design', 'HOURLY', 50.0, 65.0, '#10b981'
FROM projects p
WHERE p.project_name = 'Website Redesign'
ON CONFLICT DO NOTHING;

INSERT INTO services (project_id, name, price_type, budget_hours, hourly_rate, service_color)
SELECT p.id, 'Frontend Development', 'HOURLY', 80.0, 75.0, '#8b5cf6'
FROM projects p
WHERE p.project_name = 'Mobile App Development'
ON CONFLICT DO NOTHING;

INSERT INTO services (project_id, name, price_type, budget_hours, hourly_rate, service_color)
SELECT p.id, 'Backend Development', 'HOURLY', 70.0, 75.0, '#f59e0b'
FROM projects p
WHERE p.project_name = 'Mobile App Development'
ON CONFLICT DO NOTHING;

-- Brandbits internal services with unlimited budget hours
INSERT INTO services (project_id, name, price_type, budget_hours, hourly_rate, service_color)
SELECT p.id, 'Internal Development', 'HOURLY', 999999.0, 0.0, '#ef4444'
FROM projects p
WHERE p.project_name = 'Brandbits Internal'
ON CONFLICT DO NOTHING;

INSERT INTO services (project_id, name, price_type, budget_hours, hourly_rate, service_color)
SELECT p.id, 'Maintenance', 'HOURLY', 999999.0, 0.0, '#14b8a6'
FROM projects p
WHERE p.project_name = 'Brandbits Internal'
ON CONFLICT DO NOTHING;

INSERT INTO services (project_id, name, price_type, budget_hours, hourly_rate, service_color)
SELECT p.id, 'Frontend Development', 'HOURLY', 120.0, 85.0, '#ec4899'
FROM projects p
WHERE p.project_name = 'E-commerce Platform'
ON CONFLICT DO NOTHING;

INSERT INTO services (project_id, name, price_type, budget_hours, hourly_rate, service_color)
SELECT p.id, 'Backend Development', 'HOURLY', 100.0, 85.0, '#6366f1'
FROM projects p
WHERE p.project_name = 'E-commerce Platform'
ON CONFLICT DO NOTHING;

INSERT INTO services (project_id, name, price_type, budget_hours, hourly_rate, service_color)
SELECT p.id, 'Design', 'HOURLY', 40.0, 70.0, '#eab308'
FROM projects p
WHERE p.project_name = 'Marketing Website'
ON CONFLICT DO NOTHING;

INSERT INTO services (project_id, name, price_type, budget_hours, hourly_rate, service_color)
SELECT p.id, 'Content Creation', 'HOURLY', 30.0, 60.0, '#059669'
FROM projects p
WHERE p.project_name = 'Marketing Website'
ON CONFLICT DO NOTHING;

-- Insert sample time entries
INSERT INTO time_entries (employee_id, company_id, project_id, service_id, date, hours_worked, start_time, end_time, comment)
SELECT 
    e.id, c.id, p.id, s.id, 
    '2024-01-15'::date, 8.0, '09:00:00'::time, '17:00:00'::time,
    'Initial project setup and planning'
FROM employees e, companies c, projects p, services s
WHERE e.name = 'John Doe' 
    AND c.company_name = 'Acme Corp' 
    AND p.project_name = 'Website Redesign'
    AND s.name = 'Development'
ON CONFLICT DO NOTHING;

INSERT INTO time_entries (employee_id, company_id, project_id, service_id, date, hours_worked, start_time, end_time, comment)
SELECT 
    e.id, c.id, p.id, s.id, 
    '2024-01-16'::date, 6.5, '10:00:00'::time, '16:30:00'::time,
    'Design mockups and wireframes'
FROM employees e, companies c, projects p, services s
WHERE e.name = 'Jane Smith' 
    AND c.company_name = 'Acme Corp' 
    AND p.project_name = 'Website Redesign'
    AND s.name = 'Design'
ON CONFLICT DO NOTHING;

INSERT INTO time_entries (employee_id, company_id, project_id, service_id, date, hours_worked, start_time, end_time, comment)
SELECT 
    e.id, c.id, p.id, s.id, 
    '2024-01-17'::date, 7.0, '08:30:00'::time, '15:30:00'::time,
    'Internal development work'
FROM employees e, companies c, projects p, services s
WHERE e.name = 'Bob Johnson' 
    AND c.company_name = 'Brandbits' 
    AND p.project_name = 'Brandbits Internal'
    AND s.name = 'Internal Development'
ON CONFLICT DO NOTHING; 