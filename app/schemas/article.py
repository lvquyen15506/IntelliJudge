from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ArticleCreate(BaseModel):
    title: str
    content: str


class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


class ArticleResponse(BaseModel):
    id: int
    title: str
    content: str
    author_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
