from fastapi import APIRouter
from app.api.v1.endpoints import auth, users, problems, articles

api_router = APIRouter()

# Dang ky cac router con duoi cac prefix tuong ung
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(problems.router, prefix="/problems", tags=["Problems"])
api_router.include_router(articles.router, prefix="/articles", tags=["Articles"])
