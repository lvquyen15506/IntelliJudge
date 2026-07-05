from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api.dependencies import get_current_user, get_current_user_optional, require_admin
from app.core.database import get_db
from app.models.enums import UserRole
from app.models.problem import Problem, TestCase
from app.models.user import User
from app.schemas.problem import ProblemCreate, ProblemResponse, ProblemUpdate
from app.schemas.testcase import TestCaseCreate, TestCaseResponse, TestCaseUpdate

router = APIRouter()


@router.get("/", response_model=List[ProblemResponse])
async def read_problems(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    """API lay danh sach cac de bai (Cong khai cho moi nguoi)"""
    # Lay danh sach de bai, co loading truoc test cases nhung chi hien thi test case public
    stmt = (
        select(Problem)
        .options(selectinload(Problem.test_cases))
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    problems = result.scalars().all()

    # Vi day la danh sach, hoc sinh hoac khach khong nen xem duoc test_cases (hoac chi xem visible cases)
    # De don gian va an toan, ta tra ve de bai voi test_cases da loc is_hidden == False
    response_problems = []
    for problem in problems:
        visible_cases = [tc for tc in problem.test_cases if not tc.is_hidden]
        response_problems.append(
            ProblemResponse(
                id=problem.id,
                title=problem.title,
                description=problem.description,
                time_limit=problem.time_limit,
                memory_limit=problem.memory_limit,
                created_by_id=problem.created_by_id,
                created_at=problem.created_at,
                updated_at=problem.updated_at,
                test_cases=visible_cases,
            )
        )
    return response_problems


@router.post("/", response_model=ProblemResponse, status_code=status.HTTP_201_CREATED)
async def create_problem(
    problem_in: ProblemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """API tao de bai moi (Yeu cau quyen Admin)"""
    new_problem = Problem(
        title=problem_in.title,
        description=problem_in.description,
        time_limit=problem_in.time_limit,
        memory_limit=problem_in.memory_limit,
        created_by_id=current_user.id,
    )
    db.add(new_problem)
    await db.commit()
    await db.refresh(new_problem)
    new_problem.test_cases = []  # De bai moi chua co test cases
    return new_problem


@router.get("/{problem_id}", response_model=ProblemResponse)
async def read_problem_detail(
    problem_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """API lay chi tiet de bai. Admin duoc xem tat ca test cases, Sinh vien/Khach chi xem duoc test case cong khai."""
    stmt = (
        select(Problem)
        .where(Problem.id == problem_id)
        .options(selectinload(Problem.test_cases))
    )
    result = await db.execute(stmt)
    problem = result.scalar_one_or_none()

    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="De bai khong ton tai",
        )

    # Kiem tra quyen xem test case an
    is_admin = current_user is not None and current_user.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN)

    if is_admin:
        visible_cases = problem.test_cases
    else:
        visible_cases = [tc for tc in problem.test_cases if not tc.is_hidden]

    return ProblemResponse(
        id=problem.id,
        title=problem.title,
        description=problem.description,
        time_limit=problem.time_limit,
        memory_limit=problem.memory_limit,
        created_by_id=problem.created_by_id,
        created_at=problem.created_at,
        updated_at=problem.updated_at,
        test_cases=visible_cases,
    )


@router.put("/{problem_id}", response_model=ProblemResponse)
async def update_problem(
    problem_id: int,
    problem_in: ProblemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """API cap nhat de bai (Yeu cau quyen Admin)"""
    stmt = (
        select(Problem)
        .where(Problem.id == problem_id)
        .options(selectinload(Problem.test_cases))
    )
    result = await db.execute(stmt)
    problem = result.scalar_one_or_none()

    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="De bai khong ton tai",
        )

    # Cap nhat truong thong tin co thay doi
    for field, value in problem_in.model_dump(exclude_unset=True).items():
        setattr(problem, field, value)

    await db.commit()
    await db.refresh(problem)
    return problem


@router.delete("/{problem_id}", status_code=status.HTTP_200_OK)
async def delete_problem(
    problem_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """API xoa de bai (Yeu cau quyen Admin)"""
    stmt = select(Problem).where(Problem.id == problem_id)
    result = await db.execute(stmt)
    problem = result.scalar_one_or_none()

    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="De bai khong ton tai",
        )

    await db.delete(problem)
    await db.commit()
    return {"message": f"Xoa de bai {problem_id} va cac test cases lien quan thanh cong"}


# --- QUAN LY TEST CASES ---


@router.post("/{problem_id}/testcases", response_model=TestCaseResponse, status_code=status.HTTP_201_CREATED)
async def create_testcase(
    problem_id: int,
    testcase_in: TestCaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """API tao TestCase moi cho de bai (Yeu cau quyen Admin)"""
    # Kiem tra de bai ton tai
    stmt = select(Problem).where(Problem.id == problem_id)
    result = await db.execute(stmt)
    problem = result.scalar_one_or_none()

    if not problem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="De bai khong ton tai",
        )

    new_testcase = TestCase(
        problem_id=problem_id,
        input_data=testcase_in.input_data,
        output_data=testcase_in.output_data,
        is_hidden=testcase_in.is_hidden,
    )
    db.add(new_testcase)
    await db.commit()
    await db.refresh(new_testcase)
    return new_testcase


@router.delete("/testcases/{testcase_id}", status_code=status.HTTP_200_OK)
async def delete_testcase(
    testcase_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """API xoa TestCase (Yeu cau quyen Admin)"""
    stmt = select(TestCase).where(TestCase.id == testcase_id)
    result = await db.execute(stmt)
    testcase = result.scalar_one_or_none()

    if not testcase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="TestCase khong ton tai",
        )

    await db.delete(testcase)
    await db.commit()
    return {"message": f"Xoa testcase {testcase_id} thanh cong"}
