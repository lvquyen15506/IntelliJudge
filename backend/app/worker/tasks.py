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
    # Lay tat ca cac submission cua user
    stmt = (
        select(Submission)
        .where(Submission.user_id == user_id)
        .order_by(Submission.created_at.asc())
    )
    result = await db.execute(stmt)
    submissions = result.scalars().all()

    # Nhóm submission theo problem_id
    problem_map = {}
    for sub in submissions:
        problem_map.setdefault(sub.problem_id, []).append(sub)

    solved_count = 0
    total_score = 0.0
    total_time = 0.0
    total_penalty = 0

    for problem_id, subs in problem_map.items():
        # Lấy điểm cao nhất đạt được cho bài tập này (Mỗi bài chỉ lấy điểm cao nhất)
        max_sub_points = max((s.points or 0.0) for s in subs)
        total_score += max_sub_points

        # Kiem tra xem co submission nao AC khong
        ac_subs = [s for s in subs if s.status == SubmissionStatus.AC]
        if ac_subs:
            solved_count += 1
            # Lay submission AC dau tien
            first_ac = ac_subs[0]
            total_time += first_ac.execution_time or 0.0

            # Dem so lan nop loi truoc submission AC dau tien (khong tinh PENDING, CE)
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

            # Khởi tạo Judge0 Service
            judge0 = Judge0Service()

            max_time = 0.0
            max_memory = 0.0
            overall_status = SubmissionStatus.AC
            failed_test_case_info = None
            failed_test_case_obj = None
            failed_test_case_result = None

            # Ánh xạ ngôn ngữ lập trình sang language_id của Judge0 (54: C++ GCC 9.2.0, 71: Python 3)
            lang_id_map = {
                "cpp": 54,
                "c++": 54,
                "c++ (gcc)": 54,
                "c++ (gcc 9.2.0)": 54,
                "python": 71,
                "python 3": 71,
                "c": 50,
                "java": 62
            }
            lang_id = lang_id_map.get(submission.language.lower(), 54)

            # Chay qua tung test case
            test_case_results_list = []
            try:
                for idx, tc in enumerate(test_cases, 1):
                    res = await judge0.submit_and_wait(
                        source_code=submission.code,
                        stdin=tc.input_data,
                        expected_output=tc.output_data,
                        cpu_time_limit=problem.time_limit,
                        memory_limit=problem.memory_limit,
                        language_id=lang_id,
                    )

                    # Cap nhat thong so su dung lon nhat
                    max_time = max(max_time, res["time"])
                    max_memory = max(max_memory, res["memory"])

                    tc_status_val = res["status"].value if hasattr(res["status"], "value") else str(res["status"])
                    test_case_results_list.append({
                        "index": idx,
                        "status": tc_status_val,
                        "time": res["time"],
                        "memory": res["memory"],
                        "is_hidden": tc.is_hidden,
                        "score": 1 if res["status"] == SubmissionStatus.AC else 0,
                        "max_score": 1
                    })

                    # Neu co test case loi, dung luon (Short-circuit) de tiet kiem tai nguyen
                    if res["status"] != SubmissionStatus.AC:
                        overall_status = res["status"]
                        # Luu lai chi tiet loi compilation/runtime
                        failed_test_case_info = res["error"]
                        failed_test_case_obj = tc
                        failed_test_case_result = res
                        
                        # Danh dau cac test case con lai la SKIPPED
                        for remaining_idx in range(idx + 1, len(test_cases) + 1):
                            test_case_results_list.append({
                                "index": remaining_idx,
                                "status": "SKIPPED",
                                "time": 0.0,
                                "memory": 0.0,
                                "is_hidden": test_cases[remaining_idx - 1].is_hidden,
                                "score": 0,
                                "max_score": 1
                            })
                        break
            except Exception as e:
                print(f"[Error] Loi ket noi hoac cham bai voi Judge0: {str(e)}")
                submission.status = SubmissionStatus.SYSTEM_ERROR
                submission.ai_hint = f"Lỗi kết nối Sandbox chấm bài (Judge0): {str(e)}"
                await db.commit()
                return

            # Tính điểm bài nộp dựa trên số test cases vượt qua và điểm tối đa của đề bài
            total_tc_count = len(test_cases)
            passed_tc_count = sum(1 for tc in test_case_results_list if tc.get("status") == "AC")
            problem_max_points = problem.points if (hasattr(problem, "points") and problem.points is not None) else 1.0
            
            sub_points = round((passed_tc_count / total_tc_count) * problem_max_points, 2) if total_tc_count > 0 else 0.0

            # Cap nhat thong tin submission
            submission.status = overall_status
            submission.execution_time = max_time
            submission.memory_used = max_memory
            submission.points = sub_points
            submission.test_case_results = json.dumps(test_case_results_list)

            if overall_status == SubmissionStatus.CE:
                submission.ai_hint = (
                    f"Compile Error:\n{failed_test_case_info}"
                    if failed_test_case_info
                    else "Lỗi biên dịch mã nguồn."
                )
            elif overall_status == SubmissionStatus.AC:
                # Gọi AI Agent Service để phân tích và đánh giá tính tối ưu / Over-engineering của bài nộp AC
                try:
                    from app.services.ai_agent import AIAgentService
                    ai_service = AIAgentService()
                    hint = await ai_service.generate_ac_review(
                        source_code=submission.code,
                        problem_title=problem.title if problem else None,
                        problem_description=problem.description if problem else None,
                    )
                    submission.ai_hint = hint
                except Exception as e:
                    print(f"[AI Review AC Error]: {e}")
                    submission.ai_hint = (
                        "🎉 **Lời giải hoàn hảo!**\n\n"
                        "Bài làm của bạn đã vượt qua tất cả các test case thành công."
                    )
            else:
                # Nếu sai mà không phải CE/AC, gọi AI Agent Service để phân tích sinh hint
                if failed_test_case_obj and failed_test_case_result:
                    from app.services.ai_agent import AIAgentService
                    ai_service = AIAgentService()

                    # Chuẩn bị thông tin lỗi thực tế để LLM có thêm ngữ cảnh phân tích
                    actual_out = failed_test_case_info or "Không có thông tin standard error."
                    if overall_status == SubmissionStatus.TLE:
                        actual_out = f"Lỗi chạy quá thời gian cho phép (Time Limit Exceeded > {problem.time_limit}s)."
                    elif overall_status == SubmissionStatus.MLE:
                        actual_out = f"Lỗi vượt quá dung lượng bộ nhớ cho phép (Memory Limit Exceeded > {problem.memory_limit}MB)."

                    hint = await ai_service.generate_hint(
                        source_code=submission.code,
                        failed_input=failed_test_case_obj.input_data,
                        expected_output=failed_test_case_obj.output_data,
                        actual_output=actual_out,
                        status=overall_status.value,
                        problem_title=problem.title if problem else None,
                        problem_description=problem.description if problem else None,
                    )
                    submission.ai_hint = hint
                else:
                    submission.ai_hint = "Bài nộp gặp lỗi nhưng không lấy được dữ liệu lỗi của testcase để sinh gợi ý."

            await db.commit()

            # Neu lam dung (AC) hoac sai thi cung can tinh lai Xep hang (Ranking)
            await recalculate_user_ranking(db, submission.user_id)
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
