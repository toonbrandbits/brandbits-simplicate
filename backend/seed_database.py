#!/usr/bin/env python3
"""
Seed script to populate database with sample data using the same connection logic as the main app.
"""

import asyncio
import asyncpg
from pathlib import Path
from app.libs.database import get_db_connection

async def seed_database():
    """Seed the database with sample data."""
    
    print("Connecting to database using application connection logic...")
    
    try:
        # Use the same connection logic as the main application
        conn = await get_db_connection()
        
        # Read the initial database schema
        script_path = Path(__file__).parent / "migrations" / "init_database.sql"
        
        if not script_path.exists():
            print(f"Error: Database schema not found at {script_path}")
            return
        
        print(f"Reading database schema from {script_path}")
        
        with open(script_path, 'r') as f:
            sql_script = f.read()
        
        print("Executing database schema and seeding data...")
        
        # Execute the SQL script
        await conn.execute(sql_script)
        
        print("Database seeding completed successfully!")
        
        # Verify data was inserted
        companies = await conn.fetch("SELECT COUNT(*) as count FROM companies")
        projects = await conn.fetch("SELECT COUNT(*) as count FROM projects")
        employees = await conn.fetch("SELECT COUNT(*) as count FROM employees")
        services = await conn.fetch("SELECT COUNT(*) as count FROM services")
        time_entries = await conn.fetch("SELECT COUNT(*) as count FROM time_entries")
        
        print(f"✅ Companies: {companies[0]['count']}")
        print(f"✅ Projects: {projects[0]['count']}")
        print(f"✅ Employees: {employees[0]['count']}")
        print(f"✅ Services: {services[0]['count']}")
        print(f"✅ Time Entries: {time_entries[0]['count']}")
        
        # Show unlimited hours projects
        unlimited_projects = await conn.fetch("""
            SELECT c.company_name, p.project_name 
            FROM project_companies pc
            JOIN companies c ON pc.company_id = c.id
            JOIN projects p ON pc.project_id = p.id
            WHERE pc.unlimited_hours = TRUE
        """)
        
        if unlimited_projects:
            print("\n🔄 Unlimited Hours Projects:")
            for project in unlimited_projects:
                print(f"  - {project['company_name']}: {project['project_name']}")
        
    except Exception as e:
        print(f"Error seeding database: {e}")
        raise
    finally:
        if 'conn' in locals():
            await conn.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
