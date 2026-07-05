from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api.dependencies import get_current_user
from app.core.database import get_db
from app.models.enums import SubmissionStatus, UserRole
from app.models.submission import Submission
from app.models.problem import Problem
from app.models.user import User
from app.schemas.submission import (
    SubmissionCreate,
    SubmissionResponse,
    SubmissionBriefResponse,
    SubmissionListResponse,
)
# Import task Celery
from app.worker.tasks import process_submission_task

router = APIRouter()


@router.post("/submissions", response_model=SubmissionBriefResponse, status_code=status.HTTP_201_CREATED)
async def create_submission(
    submission_in: SubmissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """API nop bai giai (STUDENT hoac ADMIN). Day task sang Celery va tra ve ID lap tuc."""
    # Kiem tra de bai co ton tai khong
    stmt = select(Problem).where(Problem.id == submission_in.problem_id)
    result = await db.execute(stmt)
    problem = result.scalar_one_or_none()

    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="De bai khong ton tai",
        )

    # Tao ban ghi voi trang thai PENDING
    new_submission = Submission(
        problem_id=submission_in.problem_id,
        user_id=current_user.id,
        code=submission_in.code,
        language=submission_in.language,
        status=SubmissionStatus.PENDING,
        execution_time=0.0,
        memory_used=0.0,
    )
    db.add(new_submission)
    await db.commit()
    await db.refresh(new_submission)

    # Day task sang Celery Worker bang .delay()
    process_submission_task.delay(new_submission.id)

    return new_submission


@router.get("/submissions", response_model=List[SubmissionListResponse])
async def read_submissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    skip: int = 0,
    limit: int = 100,
):
    """API lay danh sach cac bai nop. Sinh vien chi xem duoc cua minh, Admin xem duoc toan bo."""
    if current_user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        stmt = (
            select(Submission)
            .options(selectinload(Submission.problem), selectinload(Submission.user))
            .order_by(Submission.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
    else:
        stmt = (
            select(Submission)
            .where(Submission.user_id == current_user.id)
            .options(selectinload(Submission.problem), selectinload(Submission.user))
            .order_by(Submission.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
    result = await db.execute(stmt)
    submissions = result.scalars().all()

    # Anh xa sang schema kem theo Problem Title va Username
    response = []
    for sub in submissions:
        response.append(
            SubmissionListResponse(
                id=sub.id,
                problem_id=sub.problem_id,
                user_id=sub.user_id,
                language=sub.language,
                status=sub.status,
                execution_time=sub.execution_time,
                memory_used=sub.memory_used,
                created_at=sub.created_at,
                problem_title=sub.problem.title if sub.problem else f"Problem #{sub.problem_id}",
                username=sub.user.username if sub.user else f"User #{sub.user_id}",
            )
        )
    return response


@router.get("/submissions/{submission_id}", response_model=SubmissionResponse)
async def read_submission_detail(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """API lay chi tiet trang thai bai nop (Dung cho Polling). Chi tac gia hoac Admin duoc xem."""
    stmt = (
        select(Submission)
        .where(Submission.id == submission_id)
        .options(selectinload(Submission.problem), selectinload(Submission.user))
    )
    result = await db.execute(stmt)
    submission = result.scalar_one_or_none()

    if not submission:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bai nop khong ton tai",
        )

    # Phanquyen: Chi chu nhan hoac Admin moi duoc quyen xem detail (tranh copy code)
    if submission.user_id != current_user.id and current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Ban khong co quyen xem chi tiet bai nop nay",
        )

    return SubmissionResponse(
        id=submission.id,
        problem_id=submission.problem_id,
        user_id=submission.user_id,
        code=submission.code,
        language=submission.language,
        status=submission.status,
        execution_time=submission.execution_time,
        memory_used=submission.memory_used,
        ai_hint=submission.ai_hint,
        created_at=submission.created_at,
        problem_title=submission.problem.title if submission.problem else f"Problem #{submission.problem_id}",
        username=submission.user.username if submission.user else f"User #{submission.user_id}",
    )


@router.get("/problems/{problem_id}/submissions", response_model=List[SubmissionBriefResponse])
async def read_my_submissions_for_problem(
    problem_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """API xem lich su nop bai cua ca nhan cho mot de bai cu the."""
    stmt = (
        select(Submission)
        .where((Submission.problem_id == problem_id) & (Submission.user_id == current_user.id))
        .order_by(Submission.created_at.desc())
    )
    result = await db.execute(stmt)
    submissions = result.scalars().all()
    return submissions
