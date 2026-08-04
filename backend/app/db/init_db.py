import os
import json
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.security import get_password_hash
from app.models.user import User
from app.models.enums import UserRole
from app.models.problem import Problem, TestCase

logger = logging.getLogger("uvicorn.error")

async def init_db(session: AsyncSession) -> None:
    """
    Tự động khởi tạo dữ liệu ban đầu cho hệ thống nếu CSDL chưa có dữ liệu:
    1. Kiểm tra & Tạo tài khoản Admin/SuperAdmin mặc định.
    2. Kiểm tra & Nạp các bài tập mẫu + test cases từ problems.json.
    """
    # --- 1. Tạo tài khoản Admin mặc định ---
    stmt_admin = select(User).where(User.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN]))
    result_admin = await session.execute(stmt_admin)
    admin_exists = result_admin.scalars().first()

    first_admin_id = None
    if not admin_exists:
        logger.info("[INIT_DB] Chưa tìm thấy tài khoản Admin nào. Đang tạo các tài khoản Admin mặc định...")
        
        # Admin 1: admin / admin123
        admin1 = User(
            username="admin",
            email="admin@example.com",
            hashed_password=get_password_hash("admin123"),
            role=UserRole.SUPER_ADMIN,
        )
        # Admin 2: admin_root / IntelliJudge@123
        admin2 = User(
            username="admin_root",
            email="admin_root@example.com",
            hashed_password=get_password_hash("IntelliJudge@123"),
            role=UserRole.SUPER_ADMIN,
        )
        
        session.add_all([admin1, admin2])
        await session.commit()
        await session.refresh(admin1)
        first_admin_id = admin1.id
        logger.info("[INIT_DB] ✅ Khởi tạo tài khoản Admin thành công! (Tài khoản: admin / admin123 và admin_root / IntelliJudge@123)")
    else:
        first_admin_id = admin_exists.id
        logger.info(f"[INIT_DB] Đã tồn tại tài khoản Admin trong hệ thống (Username: {admin_exists.username}).")

    # --- 2. Nạp dữ liệu đề bài & Test cases mẫu ---
    stmt_prob = select(Problem)
    result_prob = await session.execute(stmt_prob)
    prob_exists = result_prob.scalars().first()

    if not prob_exists:
        # Đường dẫn tìm file problems.json
        current_dir = os.path.dirname(os.path.abspath(__file__))
        possible_paths = [
            os.path.abspath(os.path.join(current_dir, "..", "..", "..", "problems.json")),
            os.path.abspath(os.path.join(current_dir, "..", "..", "problems.json")),
            "/app/problems.json",
            "problems.json",
        ]
        
        json_path = None
        for path in possible_paths:
            if os.path.exists(path):
                json_path = path
                break
                
        if json_path:
            logger.info(f"[INIT_DB] Đang nạp đề bài mẫu từ file: {json_path}")
            try:
                with open(json_path, "r", encoding="utf-8") as f:
                    problems_data = json.load(f)

                seeded_count = 0
                for prob_item in problems_data:
                    problem = Problem(
                        title=prob_item["title"],
                        description=prob_item["description"],
                        time_limit=float(prob_item.get("time_limit", 1.0)),
                        memory_limit=float(prob_item.get("memory_limit", 256.0)),
                        tags=prob_item.get("tags", "Cơ bản"),
                        created_by_id=first_admin_id
                    )
                    session.add(problem)
                    await session.flush()  # Lấy problem.id để gán cho test cases

                    test_cases = prob_item.get("test_cases", [])
                    for tc_item in test_cases:
                        tc = TestCase(
                            problem_id=problem.id,
                            input_data=tc_item["input_data"],
                            output_data=tc_item["expected_output"],
                            is_hidden=tc_item.get("is_hidden", False)
                        )
                        session.add(tc)
                    seeded_count += 1

                await session.commit()
                logger.info(f"[INIT_DB] ✅ Nạp thành công {seeded_count} đề bài mẫu cùng với các test cases!")
            except Exception as e:
                await session.rollback()
                logger.error(f"[INIT_DB] ❌ Lỗi khi đọc/nạp file problems.json: {e}")
        else:
            logger.warning("[INIT_DB] ⚠️ Không tìm thấy file problems.json để tự động seed dữ liệu.")
    else:
        logger.info("[INIT_DB] Đã có dữ liệu đề bài trong CSDL, bỏ qua bước seed bài tập mẫu.")
