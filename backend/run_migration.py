#!/usr/bin/env python3
"""
Migration script to add updated_at column to services table.
"""

import asyncio
import asyncpg
import databutton as db
import os
from pathlib import Path

async def run_migration():
    """Run the migration to add updated_at column to services table."""
    
    # Get database URL from environment variable or databutton secrets
    database_url = os.environ.get("DATABASE_URL_DEV")
    
    if not database_url:
        try:
            database_url = db.secrets.get("DATABASE_URL_DEV")
        except:
            pass
    
    if not database_url:
        print("Error: DATABASE_URL_DEV not found in environment variables or databutton secrets")
        print("Please set DATABASE_URL_DEV environment variable with your Supabase connection string")
        return
    
    print(f"Connecting to database...")
    
    try:
        # Connect to database
        conn = await asyncpg.connect(database_url)
        
        # Read the migration SQL script
        script_path = Path(__file__).parent / "migrations" / "add_updated_at_to_services.sql"
        
        if not script_path.exists():
            print(f"Error: Migration script not found at {script_path}")
            return
        
        print(f"Reading migration script from {script_path}")
        
        with open(script_path, 'r') as f:
            sql_script = f.read()
        
        print("Executing migration script...")
        
        # Execute the SQL script
        await conn.execute(sql_script)
        
        print("Migration completed successfully!")
        
        # Verify the column was added
        columns = await conn.fetch("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'services' 
            AND column_name = 'updated_at'
        """)
        
        if columns:
            print("✓ updated_at column exists in services table")
        else:
            print("✗ updated_at column not found in services table")
        
    except Exception as e:
        print(f"Error running migration: {e}")
        raise
    finally:
        if 'conn' in locals():
            await conn.close()

if __name__ == "__main__":
    asyncio.run(run_migration()) 