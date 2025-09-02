#!/usr/bin/env python3
"""
Check all users in the database
"""

import asyncio
from app.libs.database import get_db_connection

async def check_all_users():
    conn = await get_db_connection()
    try:
        print("All users in the database:")
        print("=" * 40)
        
        # Get all employees
        rows = await conn.fetch("SELECT id, name, email FROM employees ORDER BY id")
        
        if not rows:
            print("No users found!")
            return
        
        for row in rows:
            print(f"Employee ID: {row['id']}")
            print(f"Name: {row['name']}")
            print(f"Email: {row['email']}")
            
            # Check if it's a UUID email
            if '@timeflow.local' in row['email']:
                user_id = row['email'].replace('@timeflow.local', '')
                print(f"User ID: {user_id}")
                print("⚠️  Needs email update")
            else:
                print("✅ Has real email")
            
            print("-" * 30)
            
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(check_all_users())

