import asyncio
import sys
import os

# Đảm bảo python path bao gồm cả thư mục root backend để import được module app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings
from app.models.base import Base

# Import các models để đăng ký cấu trúc bảng với SQLAlchemy
from app.models.user import User, Ranking
from app.models.problem import Problem, TestCase
from app.models.submission import Submission
from app.models.article import Article

async def create_tables():
    print(f"Bắt đầu khởi tạo các bảng database...")
    print(f"Kết nối tới: {settings.DATABASE_URL}")
    
    # Tạo async engine từ DATABASE_URL cấu hình trong .env
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    
    # Thực hiện chạy create_all đồng bộ bên trong ngữ cảnh kết nối bất đồng bộ
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    print("Khởi tạo tất cả các bảng thành công!")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(create_tables())
