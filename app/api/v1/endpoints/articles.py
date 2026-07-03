from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.dependencies import get_current_user, require_admin
from app.core.database import get_db
from app.models.article import Article
from app.models.user import User
from app.schemas.article import ArticleCreate, ArticleResponse, ArticleUpdate

router = APIRouter()


@router.get("/", response_model=List[ArticleResponse])
async def read_articles(
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
):
    """API lay danh sach cac bai viet/huong dan (Cong khai cho moi nguoi)"""
    result = await db.execute(select(Article).offset(skip).limit(limit))
    articles = result.scalars().all()
    return articles


@router.post("/", response_model=ArticleResponse, status_code=status.HTTP_201_CREATED)
async def create_article(
    article_in: ArticleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """API tao bai viet moi (Yeu cau quyen Admin)"""
    new_article = Article(
        title=article_in.title,
        content=article_in.content,
        author_id=current_user.id,
    )
    db.add(new_article)
    await db.commit()
    await db.refresh(new_article)
    return new_article


@router.get("/{article_id}", response_model=ArticleResponse)
async def read_article_detail(
    article_id: int,
    db: AsyncSession = Depends(get_db),
):
    """API lay chi tiet bai viet theo ID (Cong khai cho moi nguoi)"""
    stmt = select(Article).where(Article.id == article_id)
    result = await db.execute(stmt)
    article = result.scalar_one_or_none()

    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bai viet khong ton tai",
        )
    return article


@router.put("/{article_id}", response_model=ArticleResponse)
async def update_article(
    article_id: int,
    article_in: ArticleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """API cap nhat bai viet (Yeu cau quyen Admin)"""
    stmt = select(Article).where(Article.id == article_id)
    result = await db.execute(stmt)
    article = result.scalar_one_or_none()

    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bai viet khong ton tai",
        )

    # Cap nhat truong thong tin co truyen len
    for field, value in article_in.model_dump(exclude_unset=True).items():
        setattr(article, field, value)

    await db.commit()
    await db.refresh(article)
    return article


@router.delete("/{article_id}", status_code=status.HTTP_200_OK)
async def delete_article(
    article_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """API xoa bai viet (Yeu cau quyen Admin)"""
    stmt = select(Article).where(Article.id == article_id)
    result = await db.execute(stmt)
    article = result.scalar_one_or_none()

    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bai viet khong ton tai",
        )

    await db.delete(article)
    await db.commit()
    return {"message": f"Xoa bai viet {article_id} thanh cong"}
