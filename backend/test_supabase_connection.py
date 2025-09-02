#!/usr/bin/env python3
"""
Test script to verify Supabase database connection
"""

import asyncio
import asyncpg
import os
from dotenv import load_dotenv
import traceback

async def test_connection():
    """Test the database connection"""
    
    # Load environment variables
    load_dotenv()
    
    # Get database URL from environment
    db_url = os.environ.get("DATABASE_URL") or os.environ.get("DATABASE_URL_DEV")
    
    if not db_url:
        print("❌ No DATABASE_URL found in environment variables")
        return
    
    print(f"🔗 Testing connection to: {db_url}")
    
    try:
        # Test connection
        conn = await asyncpg.connect(db_url)
        print("✅ Database connection successful!")
        
        # Test a simple query
        version = await conn.fetchval("SELECT version()")
        print(f"📊 PostgreSQL version: {version}")
        
        # Test if we can access the database
        databases = await conn.fetch("SELECT datname FROM pg_database WHERE datistemplate = false")
        print(f"🗄️  Available databases: {[db['datname'] for db in databases]}")
        
        await conn.close()
        print("✅ Connection test completed successfully!")
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print(f"🔍 Error type: {type(e).__name__}")
        print(f"📝 Full error details:")
        traceback.print_exc()
        print("\n🔍 Troubleshooting tips:")
        print("1. Check if your Supabase project is running")
        print("2. Verify the connection string format")
        print("3. Check if your IP is whitelisted in Supabase")
        print("4. Verify username/password are correct")
        print("5. Check if the database exists and is accessible")

if __name__ == "__main__":
    asyncio.run(test_connection())
