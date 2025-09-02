#!/usr/bin/env python3
"""
Test script to verify Supabase connection.
"""

import asyncio
import asyncpg
import os

async def test_connection():
    """Test the database connection."""
    
    database_url = os.environ.get("DATABASE_URL_DEV")
    
    if not database_url:
        print("Error: DATABASE_URL_DEV environment variable not set")
        return
    
    print(f"Testing connection to: {database_url}")
    
    try:
        # Try to connect
        conn = await asyncpg.connect(database_url)
        print("✅ Connection successful!")
        
        # Test a simple query
        result = await conn.fetchval("SELECT version()")
        print(f"✅ Database version: {result}")
        
        await conn.close()
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print("\nTroubleshooting tips:")
        print("1. Check if your Supabase project is active")
        print("2. Verify the connection string format")
        print("3. Make sure the password is correct")
        print("4. Check if your IP is allowed in Supabase settings")

if __name__ == "__main__":
    asyncio.run(test_connection())
