from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.testcase import TestCaseResponse


class ProblemCreate(BaseModel):
    title: str
    description: str
    time_limit: float = 1.0  # Tinh bang giay
    memory_limit: float = 256.0  # Tinh bang MB
    tags: Optional[str] = "Cơ bản"


class ProblemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    time_limit: Optional[float] = None
    memory_limit: Optional[float] = None
    tags: Optional[str] = None


class ProblemResponse(BaseModel):
    id: int
    title: str
    description: str
    time_limit: float
    memory_limit: float
    tags: Optional[str] = None
    created_by_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    test_cases: List[TestCaseResponse] = []

    model_config = ConfigDict(from_attributes=True)
