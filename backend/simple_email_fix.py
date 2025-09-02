#!/usr/bin/env python3
"""
Simple script to manually update existing users with real emails
"""

import asyncio
from app.libs.database import get_db_connection

async def update_user_emails():
    """Manually update existing users with real emails"""
    
    # Map of user IDs to real emails
    user_email_map = {
        "db67d2ee-6c84-4bae-9c40-7495b57d8c4e": "your_real_email@example.com",  # Replace with your real email
        "a99319de-a9d1-425c-b9e8-a1b1cb2a8ca8": "another_real_email@example.com",  # Replace with the other user's real email
        # Add more users as needed
    }
    
    conn = await get_db_connection()
    try:
        print("Updating user emails...")
        print("=" * 30)
        
        for user_id, real_email in user_email_map.items():
            # Find employee with UUID email
            employee_query = "SELECT id, email FROM employees WHERE email LIKE $1"
            employee_row = await conn.fetchrow(employee_query, f"{user_id}@%")
            
            if employee_row:
                old_email = employee_row['email']
                employee_id = employee_row['id']
                
                # Update the email
                update_query = "UPDATE employees SET email = $1 WHERE id = $2"
                await conn.execute(update_query, real_email, employee_id)
                
                print(f"✅ Updated employee {employee_id}: {old_email} → {real_email}")
            else:
                print(f"❌ No employee found for user ID: {user_id}")
        
        # Show all employees
        print("\n" + "=" * 30)
        print("All employees after update:")
        rows = await conn.fetch('SELECT id, name, email FROM employees ORDER BY id')
        for row in rows:
            print(f'ID: {row["id"]}, Name: {row["name"]}, Email: {row["email"]}')
            
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(update_user_emails())
