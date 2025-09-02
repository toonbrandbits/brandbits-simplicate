#!/usr/bin/env python3
"""
Setup script to initialize database with Supabase connection.
"""

import asyncio
import asyncpg
import os
from pathlib import Path

async def setup_database():
    """Set up the database with initial schema."""
    
    # Get database URL from environment variable
    database_url = os.environ.get("DATABASE_URL_DEV")
    
    if not database_url:
        print("Error: DATABASE_URL_DEV environment variable not set")
        print("Please set it with your Supabase connection string:")
        print("export DATABASE_URL_DEV='postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres'")
        return
    
    print(f"Connecting to Supabase database...")
    
    try:
        # Connect to database
        conn = await asyncpg.connect(database_url)
        
        # Read the initial database schema
        script_path = Path(__file__).parent / "migrations" / "init_database.sql"
        
        if not script_path.exists():
            print(f"Error: Database schema not found at {script_path}")
            return
        
        print(f"Reading database schema from {script_path}")
        
        with open(script_path, 'r') as f:
            sql_script = f.read()
        
        print("Executing database schema...")
        
        # Execute the SQL script
        await conn.execute(sql_script)
        
        print("Database setup completed successfully!")
        
        # Verify tables were created
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        
        print("Created tables:")
        for table in tables:
            print(f"  - {table['table_name']}")
        
    except Exception as e:
        print(f"Error setting up database: {e}")
        raise
    finally:
        if 'conn' in locals():
            await conn.close()

if __name__ == "__main__":
    asyncio.run(setup_database())
