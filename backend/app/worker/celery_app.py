from celery import Celery
from app.core.config import settings

# Khoi tao ung dung Celery voi Broker va Backend la Redis
celery_app = Celery(
    "intellijudge",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Ho_Chi_Minh",
    enable_utc=True,
)

# Tu dong tim kiem cac task duoc dinh nghia trong app/worker/
celery_app.autodiscover_tasks(["app.worker"])
