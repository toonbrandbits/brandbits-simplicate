import databutton as db
import asyncpg
import os
from app.env import mode, Mode
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

async def get_db_connection():
    # Use environment variable for database connection
    if mode == Mode.DEV:
        db_url = os.environ.get("DATABASE_URL_DEV", os.environ.get("DATABASE_URL"))
    else:
        # Production mode - use databutton secrets
        db_url = os.environ.get("DATABASE_URL_PROD", os.environ.get("DATABASE_URL"))
    
    if not db_url:
        raise ValueError("No database URL found in environment variables")
    
    conn = await asyncpg.connect(db_url)
    return conn
