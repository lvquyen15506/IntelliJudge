from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.enums import SubmissionStatus


class SubmissionCreate(BaseModel):
    problem_id: int
    code: str
    language: str = "cpp"  # Mac dinh la cpp


class SubmissionResponse(BaseModel):
    id: int
    problem_id: int
    user_id: int
    code: str
    language: str
    status: SubmissionStatus
    execution_time: Optional[float]
    memory_used: Optional[float]
    ai_hint: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubmissionBriefResponse(BaseModel):
    id: int
    problem_id: int
    user_id: int
    language: str
    status: SubmissionStatus
    execution_time: Optional[float]
    memory_used: Optional[float]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
