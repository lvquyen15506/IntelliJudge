from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.user import TokenPayload

# OAuth2PasswordBearer doc JWT tu Authorization header
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)


async def get_current_user(
    db: AsyncSession = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    """Dependency lay user hien tai tu JWT Token"""
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        token_data = TokenPayload(**payload)
    except (jwt.PyJWTError, ValidationError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token khong hop le hoac da het han",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if token_data.sub is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token khong hop le (thieu sub)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Truy van user trong DB bat dong bo
    result = await db.execute(select(User).where(User.id == int(token_data.sub)))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nguoi dung khong ton tai",
        )
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency kiem tra quyen Admin"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Thao tac bi tu choi: Yeu cau quyen Admin",
        )
    return current_user


# OAuth2PasswordBearer phien ban khong bat buoc (auto_error=False)
optional_oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login",
    auto_error=False
)


async def get_current_user_optional(
    db: AsyncSession = Depends(get_db), token: str = Depends(optional_oauth2_scheme)
) -> Optional[User]:
    """Dependency lay user neu co token hop le, khong thi tra ve None (Khong crash)"""
    from typing import Optional as Opt
    if not token:
        return None
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
        token_data = TokenPayload(**payload)
        if token_data.sub is None:
            return None
        result = await db.execute(select(User).where(User.id == int(token_data.sub)))
        return result.scalar_one_or_none()
    except Exception:
        return None

