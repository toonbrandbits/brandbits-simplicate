#!/usr/bin/env python3
"""
Check current users with UUID emails
"""

import asyncio
from app.libs.database import get_db_connection

async def check_users():
    conn = await get_db_connection()
    try:
        print("Current users with UUID emails:")
        print("=" * 40)
        
        # Get all employees with UUID emails
        rows = await conn.fetch("SELECT id, name, email FROM employees WHERE email LIKE '%@timeflow.local' ORDER BY id")
        
        if not rows:
            print("No users with UUID emails found!")
            return
        
        for row in rows:
            # Extract user ID from email
            email = row['email']
            user_id = email.replace('@timeflow.local', '')
            print(f"Employee ID: {row['id']}")
            print(f"Name: {row['name']}")
            print(f"Email: {email}")
            print(f"User ID: {user_id}")
            print("-" * 30)
            
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(check_users())

