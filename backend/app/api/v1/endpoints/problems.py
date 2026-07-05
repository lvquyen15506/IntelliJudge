from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
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
    tag: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    """API lay danh sach cac de bai (Cong khai cho moi nguoi)"""
    # Lay danh sach de bai, co loading truoc test cases nhung chi hien thi test case public
    if tag:
        stmt = (
            select(Problem)
            .where(Problem.tags.ilike(f"%{tag}%"))
            .options(selectinload(Problem.test_cases))
            .offset(skip)
            .limit(limit)
        )
    else:
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
                tags=problem.tags,
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
        tags=problem_in.tags,
        created_by_id=current_user.id,
    )
    db.add(new_problem)
    await db.commit()
    
    # Refetch problem with test_cases relationship eagerly loaded to prevent MissingGreenlet
    stmt = (
        select(Problem)
        .where(Problem.id == new_problem.id)
        .options(selectinload(Problem.test_cases))
    )
    result = await db.execute(stmt)
    created_problem = result.scalar_one()
    return created_problem


@router.post("/import-zip", status_code=status.HTTP_201_CREATED)
async def import_problems_from_zip(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """API import de bai va test cases tu file ZIP (Chi Admin)."""
    file_bytes = await file.read()
    
    try:
        import io
        import zipfile
        import json
        
        with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
            # Check if problem.json exists
            if "problem.json" not in z.namelist():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Thư mục nén ZIP thiếu file cấu hình problem.json",
                )
            
            # Read problem info
            problem_data_str = z.read("problem.json").decode("utf-8-sig")
            problem_data = json.loads(problem_data_str)
            
            title = problem_data.get("title")
            description = problem_data.get("description")
            time_limit = float(problem_data.get("time_limit", 1.0))
            memory_limit = float(problem_data.get("memory_limit", 256.0))
            tags = problem_data.get("tags", "Cơ bản")
            
            if not title or not description:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File problem.json thiếu thuộc tính 'title' hoặc 'description'",
                )
            
            # Create Problem record
            new_problem = Problem(
                title=title,
                description=description,
                time_limit=time_limit,
                memory_limit=memory_limit,
                tags=tags,
                created_by_id=current_user.id
            )
            db.add(new_problem)
            await db.commit()
            await db.refresh(new_problem)
            
            # Scan test cases under tests/ directory
            test_cases_imported = 0
            in_files = [f for f in z.namelist() if f.startswith("tests/") and f.endswith(".in")]
            
            for in_file in in_files:
                out_file = in_file[:-3] + ".out"
                if out_file in z.namelist():
                    input_data = z.read(in_file).decode("utf-8", errors="ignore").strip()
                    output_data = z.read(out_file).decode("utf-8", errors="ignore").strip()
                    
                    # Quy uoc: Neu ten file co tu "hidden" hoac "secret" thi day la testcase ẩn
                    is_hidden = "hidden" in in_file.lower() or "secret" in in_file.lower()
                    
                    new_tc = TestCase(
                        problem_id=new_problem.id,
                        input_data=input_data,
                        output_data=output_data,
                        is_hidden=is_hidden
                    )
                    db.add(new_tc)
                    test_cases_imported += 1
            
            await db.commit()
            
            return {
                "message": f"Nhập bài tập và {test_cases_imported} test cases từ file ZIP thành công!",
                "problem_id": new_problem.id,
                "title": new_problem.title,
                "test_cases_count": test_cases_imported
            }
            
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File problem.json định dạng JSON không hợp lệ.",
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi giải nén hoặc lưu trữ dữ liệu: {str(e)}",
        )


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
        tags=problem.tags,
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
    
    # Refetch problem with test_cases relationship eagerly loaded to prevent MissingGreenlet
    stmt_refetched = (
        select(Problem)
        .where(Problem.id == problem_id)
        .options(selectinload(Problem.test_cases))
    )
    result_refetched = await db.execute(stmt_refetched)
    problem = result_refetched.scalar_one()
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
