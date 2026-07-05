from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.enums import UserRole


class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class UserCreateByAdmin(BaseModel):
    username: str
    email: str
    password: str
    role: UserRole


class UserUpdateByAdmin(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    created_at: datetime

    # Cau hinh de Pydantic doc du lieu tu SQLAlchemy ORM Models
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenPayload(BaseModel):
    sub: Optional[str] = None
