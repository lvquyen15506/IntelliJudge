import asyncio
from app.core.database import AsyncSessionLocal
from app.models.problem import Problem
from app.models.submission import Submission
from app.models.user import Ranking
from sqlalchemy.future import select

async def main():
    async with AsyncSessionLocal() as db:
        res1 = await db.execute(select(Problem))
        problems = res1.scalars().all()
        print(f"PROBLEMS COUNT: {len(problems)}")

        res2 = await db.execute(select(Submission))
        subs = res2.scalars().all()
        print(f"SUBMISSIONS COUNT: {len(subs)}")

        res3 = await db.execute(select(Ranking))
        ranks = res3.scalars().all()
        print(f"RANKINGS COUNT: {len(ranks)}")

if __name__ == "__main__":
    asyncio.run(main())
