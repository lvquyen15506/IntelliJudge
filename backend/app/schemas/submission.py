# SPDX-License-Identifier: MIT
# Copyright (c) 2026 La Văn Quyền. All rights reserved.
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
    points: Optional[float] = 0.0
    test_case_results: Optional[str] = None
    ai_hint: Optional[str]
    created_at: datetime
    problem_title: Optional[str] = None
    username: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SubmissionBriefResponse(BaseModel):
    id: int
    problem_id: int
    user_id: int
    language: str
    status: SubmissionStatus
    execution_time: Optional[float]
    memory_used: Optional[float]
    points: Optional[float] = 0.0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SubmissionListResponse(BaseModel):
    id: int
    problem_id: int
    user_id: int
    language: str
    status: SubmissionStatus
    execution_time: Optional[float]
    memory_used: Optional[float]
    points: Optional[float] = 0.0
    created_at: datetime
    problem_title: Optional[str] = None
    username: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
