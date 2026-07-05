import asyncio
import sys
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings

async def add_column():
    print(f"Connecting to: {settings.DATABASE_URL}")
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE problems ADD COLUMN tags VARCHAR(255) DEFAULT 'Cơ bản';"))
            print("Successfully added 'tags' column to 'problems' table!")
        except Exception as e:
            print(f"Could not add column (it might already exist): {e}")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(add_column())
