from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, ForeignKey, DateTime, func, Integer, Float, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base
from app.models.enums import SubmissionStatus


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    problem_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("problems.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(String(30), nullable=False, default="cpp")
    status: Mapped[SubmissionStatus] = mapped_column(
        Enum(SubmissionStatus), nullable=False, default=SubmissionStatus.PENDING
    )
    execution_time: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # Don vi: Giay (seconds)
    memory_used: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # Don vi: Megabytes (MB)
    ai_hint: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Lua tru goi y tu LLM
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())

    # Quan he (Relationships)
    problem: Mapped["Problem"] = relationship(back_populates="submissions")
    user: Mapped["User"] = relationship(back_populates="submissions")
