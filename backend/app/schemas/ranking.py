from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.user import UserResponse


class RankingResponse(BaseModel):
    id: int
    user_id: int
    solved_count: int
    total_time: float
    penalty: int
    updated_at: datetime
    user: UserResponse
    total_submissions: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)
