# SPDX-License-Identifier: MIT
# Copyright (c) 2026 La Văn Quyền. All rights reserved.
import asyncio
import sys
import os

# Ensure UTF-8 output encoding for Windows stdout/stderr
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

# Ensure backend root is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import AsyncSessionLocal
from app.db.init_db import init_db

async def main():
    print("Bắt đầu chạy script khởi tạo dữ liệu (Init DB & Seed)...")
    async with AsyncSessionLocal() as session:
        await init_db(session)
    print("Hoàn tất khởi tạo dữ liệu!")

if __name__ == "__main__":
    asyncio.run(main())
