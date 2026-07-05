import sys
import os

# Set UTF-8 encoding for standard streams to prevent UnicodeEncodeError on Windows terminals
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Đảm bảo python path bao gồm cả thư mục root backend để import được module app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncio
from sqlalchemy import update
from app.db.session import async_session
from app.models.submission import Submission

async def clean_zombie_submissions():
    async with async_session() as session:
        # Tìm tất cả các bản ghi có Submission.status nằm trong list ['Pending', 'Processing']
        # Để đảm bảo truy vấn chính xác cả với định dạng viết hoa trong Database, ta cũng kiểm tra 'PENDING' và 'PROCESSING'
        target_statuses = ['Pending', 'Processing', 'PENDING', 'PROCESSING']
        
        stmt = (
            update(Submission)
            .where(Submission.status.in_(target_statuses))
            .values(
                status='SYSTEM_ERROR',
                ai_hint='Đã dọn dẹp bằng script (Lỗi Zombie Process).'
            )
        )
        
        result = await session.execute(stmt)
        await session.commit()
        
        print(f"Dọn dẹp thành công! Đã cập nhật {result.rowcount} bản ghi bị kẹt sang trạng thái SYSTEM_ERROR.")
        
    # Đóng sạch các kết nối trong pool của SQLAlchemy trước khi event loop kết thúc
    from app.core.database import engine
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(clean_zombie_submissions())
