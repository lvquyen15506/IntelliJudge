# SPDX-License-Identifier: MIT
# Copyright (c) 2026 La Văn Quyền. All rights reserved.
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.models.submission import Submission
from app.models.enums import SubmissionStatus
from typing import Any, Dict
import json
import base64

router = APIRouter()

def safe_b64decode(value: str) -> str:
    if not value:
        return ""
    try:
        padded_value = value.strip()
        missing_padding = len(padded_value) % 4
        if missing_padding:
            padded_value += '=' * (4 - missing_padding)
        return base64.b64decode(padded_value.encode("utf-8")).decode("utf-8", errors="replace")
    except Exception:
        return value

def parse_judge0_result(data: Dict[str, Any]) -> Dict[str, Any]:
    status_info = data.get("status", {})
    status_id = status_info.get("id", 13)
    status_desc = status_info.get("description", "")

    time_taken = float(data.get("time") or 0.0)
    memory_used = float(data.get("memory") or 0.0) / 1024.0

    compile_output = safe_b64decode(data.get("compile_output") or "")
    stderr = safe_b64decode(data.get("stderr") or "")
    error_message = compile_output or stderr

    if status_id == 3:
        mapped_status = SubmissionStatus.AC
    elif status_id == 4:
        mapped_status = SubmissionStatus.WA
    elif status_id == 5:
        mapped_status = SubmissionStatus.TLE
    elif status_id == 6:
        mapped_status = SubmissionStatus.CE
    elif status_id in [7, 8, 9, 10, 11, 12]:
        if "memory limit exceeded" in status_desc.lower() or "out of memory" in error_message.lower():
            mapped_status = SubmissionStatus.MLE
        else:
            mapped_status = SubmissionStatus.WA
    else:
        mapped_status = SubmissionStatus.WA

    if "memory limit exceeded" in status_desc.lower():
        mapped_status = SubmissionStatus.MLE

    return {
        "status": mapped_status,
        "time": time_taken,
        "memory": memory_used,
        "error": error_message,
        "status_val": mapped_status.value
    }

@router.put("/judge0", status_code=status.HTTP_200_OK)
async def judge0_webhook(
    request: Request,
    submission_id: int,
    tc_index: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Webhook nhan ket qua tra ve tu Judge0 cho tung test case.
    """
    payload = await request.json()
    result = parse_judge0_result(payload)
    
    # 1. Lay submission tu DB voi Lock de tranh Race Condition khi nhieu Webhook cung cap nhat
    stmt = select(Submission).where(Submission.id == submission_id).with_for_update()
    res = await db.execute(stmt)
    submission = res.scalar_one_or_none()
    
    if not submission:
        return {"msg": "Submission not found"}

    # Load cac test_case_results hien tai (chuoi JSON)
    current_results = []
    if submission.test_case_results:
        try:
            current_results = json.loads(submission.test_case_results)
        except Exception:
            pass

    found = False
    for r in current_results:
        if r.get("index") == tc_index:
            r["status"] = result["status_val"]
            r["time"] = result["time"]
            r["memory"] = result["memory"]
            r["score"] = 1 if result["status"] == SubmissionStatus.AC else 0
            found = True
            break
            
    if not found:
        current_results.append({
            "index": tc_index,
            "status": result["status_val"],
            "time": result["time"],
            "memory": result["memory"],
            "score": 1 if result["status"] == SubmissionStatus.AC else 0,
            "max_score": 1
        })
        
    submission.test_case_results = json.dumps(current_results)
    
    # Tinh toan lai overall status va points neu da nhan du ket qua
    from app.models.problem import TestCase, Problem
    from sqlalchemy import func
    
    total_tcs_stmt = select(func.count(TestCase.id)).where(TestCase.problem_id == submission.problem_id)
    total_tcs_res = await db.execute(total_tcs_stmt)
    total_tcs = total_tcs_res.scalar() or 0
    
    if len(current_results) == total_tcs and total_tcs > 0:
        # Tinh toan overall status va diem so
        max_time = 0.0
        max_memory = 0.0
        passed_count = 0
        overall_status = SubmissionStatus.AC
        failed_tc_index = None
        failed_tc_out = ""
        
        # Sort results by index to find the first failure logically
        sorted_results = sorted(current_results, key=lambda x: x["index"])
        
        for r in sorted_results:
            max_time = max(max_time, r["time"])
            max_memory = max(max_memory, r["memory"])
            if r["status"] == SubmissionStatus.AC.value:
                passed_count += 1
            else:
                if overall_status == SubmissionStatus.AC:
                    overall_status = SubmissionStatus(r["status"])
                    failed_tc_index = r["index"]
                    # Ghi nhan ket qua loi tu result payload goc neu can
                    failed_tc_out = result.get("error", "")

        # Tinh diem
        problem_res = await db.execute(select(Problem).where(Problem.id == submission.problem_id))
        problem = problem_res.scalar_one_or_none()
        max_points = problem.points if problem else 1.0
        sub_points = round((passed_count / total_tcs) * max_points, 2)
        
        submission.status = overall_status
        submission.execution_time = max_time
        submission.memory_used = max_memory
        submission.points = sub_points
        
        # Tinh xep hang
        from app.worker.tasks import recalculate_user_ranking, generate_ai_hint_task
        await db.commit() # Commit truoc de recalculate query duoc data moi
        
        # Tinh lai Ranking trong cung request, hoac ban task
        # De an toan tranh deadlocks:
        async with AsyncSession(db.bind) as new_session:
            await recalculate_user_ranking(new_session, submission.user_id)
        
        # Goi AI Hint thong qua Celery phu
        if overall_status == SubmissionStatus.AC:
            generate_ai_hint_task.delay(submission.id, "AC")
        elif overall_status != SubmissionStatus.CE and failed_tc_index:
            # Tim id cua testcase bi loi
            tc_id_res = await db.execute(
                select(TestCase.id)
                .where(TestCase.problem_id == submission.problem_id)
                .order_by(TestCase.id.asc())
                .offset(failed_tc_index - 1)
                .limit(1)
            )
            failed_tc_id = tc_id_res.scalar()
            if failed_tc_id:
                generate_ai_hint_task.delay(
                    submission.id,
                    overall_status.value,
                    failed_tc_id,
                    failed_tc_out
                )
    else:
        await db.commit()
    
    return {"msg": "Webhook received"}
