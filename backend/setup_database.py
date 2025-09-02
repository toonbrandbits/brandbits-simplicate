#!/usr/bin/env python3
"""
Database setup script for TimeFlow application.
This script initializes the database with all required tables and sample data.
"""

import asyncio
import asyncpg
import databutton as db
import os
from pathlib import Path

async def setup_database():
    """Initialize the database with all required tables and sample data."""
    
    # Get database URL from databutton secrets
    database_url = db.secrets.get("DATABASE_URL_DEV")
    
    if not database_url:
        print("Error: DATABASE_URL_DEV not found in databutton secrets")
        return
    
    print(f"Connecting to database...")
    
    try:
        # Connect to database
        conn = await asyncpg.connect(database_url)
        
        # Read the initialization SQL script
        script_path = Path(__file__).parent / "migrations" / "init_database.sql"
        
        if not script_path.exists():
            print(f"Error: Database initialization script not found at {script_path}")
            return
        
        print(f"Reading database initialization script from {script_path}")
        
        with open(script_path, 'r') as f:
            sql_script = f.read()
        
        print("Executing database initialization script...")
        
        # Execute the SQL script
        await conn.execute(sql_script)
        
        print("Database initialization completed successfully!")
        
        # Verify tables were created
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        """)
        
        print("\nCreated tables:")
        for table in tables:
            print(f"  - {table['table_name']}")
        
        # Check sample data
        companies_count = await conn.fetchval("SELECT COUNT(*) FROM companies")
        projects_count = await conn.fetchval("SELECT COUNT(*) FROM projects")
        
        print(f"\nSample data:")
        print(f"  - Companies: {companies_count}")
        print(f"  - Projects: {projects_count}")
        
    except Exception as e:
        print(f"Error setting up database: {e}")
        raise
    finally:
        if 'conn' in locals():
            await conn.close()

if __name__ == "__main__":
    asyncio.run(setup_database()) 