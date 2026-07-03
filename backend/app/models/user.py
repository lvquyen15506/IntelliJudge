from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Enum, ForeignKey, DateTime, func, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from app.models.enums import UserRole


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False, default=UserRole.STUDENT)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())

    # Quan he (Relationships)
    submissions: Mapped[List["Submission"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    problems: Mapped[List["Problem"]] = relationship(
        back_populates="creator"
    )
    articles: Mapped[List["Article"]] = relationship(
        back_populates="author"
    )
    ranking: Mapped[Optional["Ranking"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Ranking(Base):
    __tablename__ = "rankings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    solved_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_time: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)  # Tong thoi gian chay các bai AC
    penalty: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # So lan nop sai truoc khi AC
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())

    # Quan he (Relationships)
    user: Mapped["User"] = relationship(back_populates="ranking")
