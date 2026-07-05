import asyncio
from celery import Celery
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import AsyncSessionLocal
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
    total_time = 0.0
    total_penalty = 0

    for problem_id, subs in problem_map.items():
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
    ranking.total_time = total_time
    ranking.penalty = total_penalty
    await db.commit()


async def async_process_submission(submission_id: int):
    """
    Logic cham bai bat dong bo thuc su.
    """
    async with AsyncSessionLocal() as db:
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

        # Ánh xạ ngôn ngữ lập trình sang language_id của Judge0 (54: C++, 62: Java, 71: Python 3)
        lang_id_map = {
            "cpp": 54,
            "java": 62,
            "python": 71
        }
        lang_id = lang_id_map.get(submission.language.lower(), 54)

        # Chay qua tung test case
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

                # Neu co test case loi, dung luon (Short-circuit) de tiet kiem tai nguyen
                if res["status"] != SubmissionStatus.AC:
                    overall_status = res["status"]
                    # Luu lai chi tiet loi compilation/runtime
                    failed_test_case_info = res["error"]
                    failed_test_case_obj = tc
                    failed_test_case_result = res
                    break
        except Exception as e:
            print(f"[Error] Loi ket noi hoac cham bai voi Judge0: {str(e)}")
            submission.status = SubmissionStatus.SYSTEM_ERROR
            submission.ai_hint = f"Lỗi kết nối Sandbox chấm bài (Judge0): {str(e)}"
            await db.commit()
            return

        # Cap nhat thong tin submission
        submission.status = overall_status
        submission.execution_time = max_time
        submission.memory_used = max_memory

        if overall_status == SubmissionStatus.CE:
            submission.ai_hint = (
                f"Compile Error:\n{failed_test_case_info}"
                if failed_test_case_info
                else "Loi bien dich ma nguon C++."
            )
        elif overall_status != SubmissionStatus.AC:
            # Neu sai ma khong phai CE, goi AI Agent Service de phan tich sinh hint
            if failed_test_case_obj and failed_test_case_result:
                from app.services.ai_agent import AIAgentService
                ai_service = AIAgentService()

                # Chuan bi thong tin loi thuc te de LLM co them ngu canh phan tich
                actual_out = failed_test_case_info or "Khong co thong tin standard error."
                if overall_status == SubmissionStatus.TLE:
                    actual_out = f"Loi chay qua thoi gian cho phep (Time Limit Exceeded > {problem.time_limit}s)."
                elif overall_status == SubmissionStatus.MLE:
                    actual_out = f"Loi vuot qua dung luong bo nho cho phep (Memory Limit Exceeded > {problem.memory_limit}MB)."

                hint = await ai_service.generate_hint(
                    source_code=submission.code,
                    failed_input=failed_test_case_obj.input_data,
                    expected_output=failed_test_case_obj.output_data,
                    actual_output=actual_out,
                    status=overall_status.value,
                )
                submission.ai_hint = hint
            else:
                submission.ai_hint = "Bai nop gap loi nhung khong lay duoc du lieu loi cua testcase de sinh goi y."

        await db.commit()

        # Neu lam dung (AC) hoac sai thi cung can tinh lai Xep hang (Ranking)
        await recalculate_user_ranking(db, submission.user_id)


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
