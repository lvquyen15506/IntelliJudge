from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine
from app.models.base import Base
# Import models để SQLAlchemy nhận diện metadata
import app.models.user  # noqa
import app.models.problem  # noqa
import app.models.submission  # noqa
import app.models.article  # noqa
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi tạo tự động các bảng database nếu chưa tồn tại
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"Lỗi khi tự động khởi tạo database tables: {e}")
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Cấu hình CORS cho phép gọi API từ frontend (có thể điều chỉnh cụ thể hơn khi lên production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Đăng ký API router v1
app.include_router(api_router, prefix=settings.API_V1_STR)


# API kiểm tra trạng thái hoạt động của hệ thống
@app.get("/", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
    }


