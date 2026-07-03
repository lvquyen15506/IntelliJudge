from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.models.user import Ranking
from app.schemas.ranking import RankingResponse

router = APIRouter()


@router.get("/", response_model=List[RankingResponse])
async def read_rankings(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    """API lay bang xep hang hoc sinh. Sap xep: solved_count (desc) -> total_time (asc) -> penalty (asc)."""
    stmt = (
        select(Ranking)
        .options(joinedload(Ranking.user))
        .order_by(
            Ranking.solved_count.desc(),
            Ranking.total_time.asc(),
            Ranking.penalty.asc(),
        )
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    rankings = result.scalars().all()
    return rankings
