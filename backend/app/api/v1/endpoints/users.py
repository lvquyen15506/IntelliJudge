from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.dependencies import get_current_user, require_admin, require_super_admin
from app.core.database import get_db
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.user import UserResponse, UserCreateByAdmin, UserUpdateByAdmin
from app.core.security import get_password_hash

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def read_user_me(current_user: User = Depends(get_current_user)):
    """API lay thong tin nguoi dung hien tai"""
    return current_user


@router.get("/", response_model=List[UserResponse])
async def read_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
    skip: int = 0,
    limit: int = 100,
):
    """API lay danh sach toan bo nguoi dung (Yeu cau quyen Admin hoac Super Admin)"""
    result = await db.execute(select(User).offset(skip).limit(limit))
    users = result.scalars().all()
    return users


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user_by_admin(
    user_in: UserCreateByAdmin,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """API tao tai khoan nguoi dung moi boi Admin hoac Super Admin"""
    # Kiem tra quyen han voi vai tro muon tao
    if current_user.role == UserRole.ADMIN and user_in.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Thao tác bị từ chối: ADMIN chỉ được phép tạo tài khoản STUDENT",
        )

    # Kiem tra xem email hoac username da ton tai chua
    result = await db.execute(
        select(User).where((User.email == user_in.email) | (User.username == user_in.username))
    )
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username hoac Email da ton tai tren he thong",
        )

    new_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user_by_admin(
    user_id: int,
    user_in: UserUpdateByAdmin,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """API cap nhat tai khoan nguoi dung boi Admin hoac Super Admin"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nguoi dung khong ton tai",
        )
    
    # Kiem tra quyen han dong (Data-driven permission check)
    if current_user.role == UserRole.ADMIN:
        if user.role != UserRole.STUDENT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Thao tác bị từ chối: ADMIN không được quyền sửa tài khoản của ADMIN khác hoặc SUPER_ADMIN",
            )
        if user_in.role and user_in.role != UserRole.STUDENT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Thao tác bị từ chối: ADMIN không được quyền nâng cấp vai trò của người dùng",
            )

    if user_in.username and user_in.username != user.username:
        username_check = await db.execute(select(User).where(User.username == user_in.username))
        if username_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tên tài khoản đã tồn tại",
            )
        user.username = user_in.username

    if user_in.email and user_in.email != user.email:
        email_check = await db.execute(select(User).where(User.email == user_in.email))
        if email_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Địa chỉ Email đã tồn tại",
            )
        user.email = user_in.email

    if user_in.password:
        user.hashed_password = get_password_hash(user_in.password)

    if user_in.role:
        user.role = user_in.role

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user_by_admin(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """API xoa tai khoan nguoi dung boi Admin hoac Super Admin"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nguoi dung khong ton tai",
        )
    
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ban khong the tu xoa chinh tai khoan cua minh",
        )

    # Kiem tra quyen han dong (Data-driven permission check)
    if current_user.role == UserRole.ADMIN:
        if user.role != UserRole.STUDENT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Thao tác bị từ chối: ADMIN không được quyền xóa tài khoản của ADMIN hoặc SUPER_ADMIN",
            )

    await db.delete(user)
    await db.commit()
    return {"message": "Xoa tai khoan thanh cong"}


