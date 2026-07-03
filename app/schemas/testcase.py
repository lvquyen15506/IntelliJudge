from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class TestCaseCreate(BaseModel):
    input_data: str
    output_data: str
    is_hidden: bool = False


class TestCaseUpdate(BaseModel):
    input_data: Optional[str] = None
    output_data: Optional[str] = None
    is_hidden: Optional[bool] = None


class TestCaseResponse(BaseModel):
    id: int
    problem_id: int
    input_data: str
    output_data: str
    is_hidden: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
