# SPDX-License-Identifier: MIT
# Copyright (c) 2026 La Văn Quyền. All rights reserved.
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.models.user import Ranking
from app.models.submission import Submission
from app.schemas.ranking import RankingResponse

router = APIRouter()


@router.get("", response_model=List[RankingResponse])
@router.get("/", response_model=List[RankingResponse])
async def read_rankings(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    """API lay bang xep hang hoc sinh. Sap xep: total_score (desc) -> solved_count (desc) -> total_time (asc) -> penalty (asc)."""
    stmt = (
        select(Ranking)
        .options(joinedload(Ranking.user))
        .order_by(
            Ranking.total_score.desc(),
            Ranking.solved_count.desc(),
            Ranking.total_time.asc(),
            Ranking.penalty.asc(),
        )
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(stmt)
    rankings = result.scalars().all()

    # Tinh toan số luợng bài đã nộp (total_submissions) động cho tung sinh vien
    response_rankings = []
    for r in rankings:
        sub_count_stmt = select(func.count(Submission.id)).where(Submission.user_id == r.user_id)
        sub_count_res = await db.execute(sub_count_stmt)
        total_subs = sub_count_res.scalar() or 0

        response_rankings.append(
            RankingResponse(
                id=r.id,
                user_id=r.user_id,
                solved_count=r.solved_count,
                total_score=r.total_score or 0.0,
                total_time=r.total_time,
                penalty=r.penalty,
                updated_at=r.updated_at,
                user=r.user,
                total_submissions=total_subs
            )
        )
    return response_rankings
