#!/usr/bin/env python3
"""
Script to update the .env file with the correct Session pooler connection string
"""

import os

def update_env_file():
    """Update the .env file with correct Session pooler database URLs"""
    
    env_file = '.env'
    
    # Read the current .env file
    with open(env_file, 'r') as f:
        content = f.read()
    
    # Define the correct Session pooler connection string
    correct_connection = "postgresql://postgres.nwftfbtdsguiyalpltgj:I4DGOvOWsGcx4met@aws-1-eu-west-3.pooler.supabase.com:5432/postgres"
    
    # Replace the old connection strings
    content = content.replace(
        "DATABASE_URL=postgresql://postgres:I4DGOvOWsGcx4met@nwftfbtdsguiyalpltgj.supabase.co:5432/postgres",
        f"DATABASE_URL={correct_connection}"
    )
    
    content = content.replace(
        "DATABASE_URL_DEV=postgresql://postgres:I4DGOvOWsGcx4met@nwftfbtdsguiyalpltgj.supabase.co:5432/postgres",
        f"DATABASE_URL_DEV={correct_connection}"
    )
    
    # Write the updated content back
    with open(env_file, 'w') as f:
        f.write(content)
    
    print("✅ .env file updated successfully!")
    print(f"🔗 New Session pooler connection string: {correct_connection}")
    print("📝 This uses the IPv4-compatible pooler connection")

if __name__ == "__main__":
    update_env_file()



