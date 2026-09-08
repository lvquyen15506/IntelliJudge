# SPDX-License-Identifier: MIT
# Copyright (c) 2026 La Văn Quyền. All rights reserved.
import json
import asyncio
from celery import Celery
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool
from app.core.config import settings
from app.models.enums import SubmissionStatus
from app.models.problem import Problem, TestCase
from app.models.submission import Submission
from app.models.user import User, Ranking
from app.services.sandbox import Judge0Service
from app.worker.celery_app import celery_app


async def recalculate_user_ranking(db, user_id: int):
    """
    Tinh toan lai Ranking cua User theo quy tac ICPC:
    - solved_count: So luong de bai khac nhau da giai dung (AC).
    - total_time: Tong thoi gian chay cua cac bai nop dung (AC) dau tien.
    - penalty: Tong so luong bai nop sai (WA, TLE, MLE) truoc khi dat duoc AC dau tien cho moi bai.
    """
    # Chi truy van cac cot can thiet de toi uu RAM thay vi load toan bo obj (code, test results, etc.)
    stmt = (
        select(Submission.problem_id, Submission.status, Submission.execution_time, Submission.points)
        .where(Submission.user_id == user_id)
        .order_by(Submission.created_at.asc())
    )
    result = await db.execute(stmt)
    submissions = result.all()

    # Nhóm submission theo problem_id
    problem_map = {}
    for sub in submissions:
        problem_map.setdefault(sub.problem_id, []).append(sub)

    solved_count = 0
    total_score = 0.0
    total_time = 0.0
    total_penalty = 0

    for problem_id, subs in problem_map.items():
        # Lấy điểm cao nhất đạt được cho bài tập này
        max_sub_points = max((s.points or 0.0) for s in subs)
        total_score += max_sub_points

        # Kiem tra xem co submission nao AC khong
        ac_subs = [s for s in subs if s.status == SubmissionStatus.AC]
        if ac_subs:
            solved_count += 1
            # Lay submission AC dau tien
            first_ac = ac_subs[0]
            total_time += first_ac.execution_time or 0.0

            # Dem so lan nop loi truoc submission AC dau tien
            for s in subs:
                if s == first_ac:
                    break
                if s.status in [SubmissionStatus.WA, SubmissionStatus.TLE, SubmissionStatus.MLE]:
                    total_penalty += 1

    # Cap nhat hoac tao moi ban ghi Ranking
    stmt = select(Ranking).where(Ranking.user_id == user_id)
    res = await db.execute(stmt)
    ranking = res.scalar_one_or_none()

    if not ranking:
        ranking = Ranking(user_id=user_id)
        db.add(ranking)

    ranking.solved_count = solved_count
    ranking.total_score = round(total_score, 2)
    ranking.total_time = total_time
    ranking.penalty = total_penalty
    await db.commit()


async def async_process_submission(submission_id: int):
    """
    Logic cham bai bat dong bo thuc su.
    Tạo engine mới với NullPool để không bị dính Event Loop cũ giữa các Celery Tasks.
    """
    task_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    task_session_maker = async_sessionmaker(bind=task_engine, class_=AsyncSession, expire_on_commit=False)

    try:
        async with task_session_maker() as db:
            # Load submission di kem problem, testcases va user
            stmt = (
                select(Submission)
                .where(Submission.id == submission_id)
                .options(
                    selectinload(Submission.problem).selectinload(Problem.test_cases),
                    selectinload(Submission.user),
                )
            )
            result = await db.execute(stmt)
            submission = result.scalar_one_or_none()

            if not submission:
                print(f"[Error] Submission {submission_id} khong ton tai.")
                return

            problem = submission.problem
            if not problem:
                print(f"[Error] Problem lien quan den submission {submission_id} khong ton tai.")
                submission.status = SubmissionStatus.CE
                submission.ai_hint = "De bai da bi xoa khoi he thong."
                await db.commit()
                return

            test_cases = problem.test_cases
            if not test_cases:
                print(f"[Warning] Problem {problem.id} chua co test cases.")
                submission.status = SubmissionStatus.SYSTEM_ERROR
                submission.ai_hint = "Bài tập chưa có Test Case. Vui lòng báo Giảng viên."
                submission.execution_time = 0.0
                submission.memory_used = 0.0
                await db.commit()
                return

            # Gửi song song tất cả các test cases qua Webhook
            import asyncio
            judge0 = Judge0Service()
            
            # Đặt trạng thái ban đầu là PENDING trong lúc chờ Webhook
            submission.status = SubmissionStatus.PENDING
            await db.commit()
            
            lang_id_map = {
                "cpp": 54, "c++": 54, "c++ (gcc)": 54, "c++ (gcc 9.2.0)": 54,
                "python": 71, "python 3": 71, "c": 50, "java": 62
            }
            lang_id = lang_id_map.get(submission.language.lower(), 54)
            
            # Cấu hình webhook URL
            # Lấy địa chỉ backend URL. Nếu chạy qua Docker, host.docker.internal là an toàn.
            import os
            backend_url = os.environ.get("BACKEND_WEBHOOK_URL", "http://host.docker.internal:8000")
            
            tasks = []
            for idx, tc in enumerate(test_cases, 1):
                callback_url = f"{backend_url.rstrip('/')}/api/v1/webhooks/judge0?submission_id={submission.id}&tc_index={idx}"
                
                tasks.append(
                    judge0.submit_async(
                        source_code=submission.code,
                        stdin=tc.input_data,
                        expected_output=tc.output_data,
                        callback_url=callback_url,
                        cpu_time_limit=problem.time_limit,
                        memory_limit=problem.memory_limit,
                        language_id=lang_id,
                    )
                )
            
            # Bắn tất cả test cases cùng lúc, hoàn thành cực nhanh
            await asyncio.gather(*tasks, return_exceptions=True)
            
            # Worker kết thúc tại đây, không cần đợi kết quả.
            # Việc tính điểm và tính Ranking sẽ do endpoints/webhooks.py đảm nhận khi nhận đủ webhook.



    finally:
        await task_engine.dispose()


@celery_app.task(name="app.worker.tasks.process_submission_task")
def process_submission_task(submission_id: int):
    """
    Task Celery chay dong bo: Mo mot event loop va chay ham async thuc te.
    """
    print(f"[Celery] Bat dau xu ly cham bai cho Submission ID: {submission_id}")
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(async_process_submission(submission_id))
    finally:
        loop.close()
    print(f"[Celery] Hoan thanh cham bai cho Submission ID: {submission_id}")


async def async_generate_ai_hint(submission_id: int, status_val: str, failed_tc_id: int = None, actual_out: str = None):
    task_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    task_session_maker = async_sessionmaker(bind=task_engine, class_=AsyncSession, expire_on_commit=False)
    try:
        async with task_session_maker() as db:
            stmt = select(Submission).where(Submission.id == submission_id).options(selectinload(Submission.problem))
            res = await db.execute(stmt)
            submission = res.scalar_one_or_none()
            if not submission or not submission.problem:
                return

            from app.services.ai_agent import AIAgentService
            ai_service = AIAgentService()
            
            if status_val == "AC":
                try:
                    hint = await ai_service.generate_ac_review(
                        source_code=submission.code,
                        problem_title=submission.problem.title,
                        problem_description=submission.problem.description,
                    )
                    submission.ai_hint = hint
                except Exception as e:
                    submission.ai_hint = "🎉 **Lời giải hoàn hảo!**\n\nBài làm của bạn đã vượt qua tất cả các test case thành công."
            else:
                if failed_tc_id:
                    tc_res = await db.execute(select(TestCase).where(TestCase.id == failed_tc_id))
                    tc = tc_res.scalar_one_or_none()
                    if tc:
                        hint = await ai_service.generate_hint(
                            source_code=submission.code,
                            failed_input=tc.input_data,
                            expected_output=tc.output_data,
                            actual_output=actual_out or "",
                            status=status_val,
                            problem_title=submission.problem.title,
                            problem_description=submission.problem.description,
                        )
                        submission.ai_hint = hint
            await db.commit()
    finally:
        await task_engine.dispose()

@celery_app.task(name="app.worker.tasks.generate_ai_hint_task")
def generate_ai_hint_task(submission_id: int, status_val: str, failed_tc_id: int = None, actual_out: str = None):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(async_generate_ai_hint(submission_id, status_val, failed_tc_id, actual_out))
    finally:
        loop.close()
