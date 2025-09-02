# Local Database Setup Guide

This guide will help you set up a local PostgreSQL database for the TimeFlow application.

## Prerequisites

1. **PostgreSQL** - You need PostgreSQL installed on your system
2. **Python** - Python 3.8+ with asyncpg support
3. **Database client** (optional) - pgAdmin, DBeaver, or similar for database management

## Installation Options

### Option 1: Install PostgreSQL Locally

#### macOS (using Homebrew)
```bash
brew install postgresql
brew services start postgresql
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Windows
Download and install from: https://www.postgresql.org/download/windows/

### Option 2: Use Docker (Recommended)

If you have Docker installed, this is the easiest way:

```bash
# Create a PostgreSQL container
docker run --name timeflow-db \
  -e POSTGRES_DB=timeflow \
  -e POSTGRES_USER=timeflow \
  -e POSTGRES_PASSWORD=timeflow123 \
  -p 5432:5432 \
  -d postgres:15

# To start the container later
docker start timeflow-db

# To stop the container
docker stop timeflow-db
```

## Database Setup

### 1. Create Database

If using local PostgreSQL:

```bash
# Connect to PostgreSQL as superuser
sudo -u postgres psql

# Create database and user
CREATE DATABASE timeflow;
CREATE USER timeflow WITH PASSWORD 'timeflow123';
GRANT ALL PRIVILEGES ON DATABASE timeflow TO timeflow;
\q
```

### 2. Set Environment Variables

Create or update your `.env` file in the backend directory:

```bash
# backend/.env
DATABASE_URL_DEV=postgresql://timeflow:timeflow123@localhost:5432/timeflow
DATABASE_URL_ADMIN_DEV=postgresql://postgres:your_password@localhost:5432/timeflow
```

### 3. Run Database Setup Script

```bash
cd backend
python setup_database_local.py
```

This script will:
- Connect to your local database
- Create all required tables
- Insert sample data
- Verify the setup

## Verification

After running the setup script, you should see output like:

```
Connecting to database: postgresql://timeflow:timeflow123@localhost:5432/timeflow
Reading database initialization script from /path/to/migrations/init_database.sql
Executing database initialization script...
Database initialization completed successfully!

Created tables:
  - companies
  - employees
  - project_companies
  - projects
  - services
  - time_entries

Sample data:
  - Companies: 2
  - Projects: 2
```

## Running the Application

### 1. Start the Backend

```bash
cd backend
python main.py
```

The backend will now connect to your local database instead of the remote one.

### 2. Start the Frontend

```bash
cd frontend
npm run dev
```

### 3. Access the Application

Visit http://localhost:5173 to access the TimeFlow application.

## Database Management

### Connect to Database

```bash
# Using psql
psql -h localhost -U timeflow -d timeflow

# Using Docker
docker exec -it timeflow-db psql -U timeflow -d timeflow
```

### Useful Commands

```sql
-- List all tables
\dt

-- View table structure
\d table_name

-- View sample data
SELECT * FROM companies;
SELECT * FROM projects;
SELECT * FROM time_entries;

-- Reset database (if needed)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

## Troubleshooting

### Connection Issues

1. **Check if PostgreSQL is running:**
   ```bash
   # macOS
   brew services list | grep postgresql
   
   # Linux
   sudo systemctl status postgresql
   
   # Docker
   docker ps | grep postgres
   ```

2. **Check connection:**
   ```bash
   psql -h localhost -U timeflow -d timeflow
   ```

3. **Verify environment variables:**
   ```bash
   echo $DATABASE_URL_DEV
   ```

### Permission Issues

If you get permission errors:

```bash
# Grant necessary permissions
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE timeflow TO timeflow;
GRANT ALL PRIVILEGES ON SCHEMA public TO timeflow;
\q
```

### Port Conflicts

If port 5432 is already in use:

```bash
# Check what's using the port
lsof -i :5432

# Use a different port in Docker
docker run --name timeflow-db \
  -e POSTGRES_DB=timeflow \
  -e POSTGRES_USER=timeflow \
  -e POSTGRES_PASSWORD=timeflow123 \
  -p 5433:5432 \
  -d postgres:15
```

Then update your DATABASE_URL_DEV to use port 5433.

## Data Migration

If you have existing data in a remote database that you want to migrate:

```bash
# Export from remote database
pg_dump -h remote_host -U username -d database_name > backup.sql

# Import to local database
psql -h localhost -U timeflow -d timeflow < backup.sql
```

## Development Workflow

1. **Start local database** (Docker or local PostgreSQL)
2. **Set environment variables** in `.env`
3. **Run setup script** to initialize database
4. **Start backend** - connects to local database
5. **Start frontend** - connects to local backend
6. **Make changes** and test locally
7. **Commit changes** when ready

This setup gives you a complete local development environment for the TimeFlow application! 