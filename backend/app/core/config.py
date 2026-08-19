# SPDX-License-Identifier: MIT
# Copyright (c) 2026 La Văn Quyền. All rights reserved.
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "IntelliJudge"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True

    # Database Configuration
    DATABASE_URL: str

    # Security Configuration
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Redis & Celery Configuration
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Sandbox API Configuration (Judge0)
    JUDGE0_API_URL: str = "http://localhost:2358"
    JUDGE0_SERVER_URL: str = "http://localhost:2358"
    SANDBOX_URL: str = "http://localhost:2358"
    JUDGE0_API_KEY: str = ""

    # AI Agent LLM Configuration
    LLM_API_URL: str = "http://localhost:11434/v1"
    LLM_API_KEY: str = "ollama"
    LLM_MODEL: str = "qwen2.5-coder:7b"

    # Settings Configuration to load from .env
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()

# Phòng thủ: Tự động sửa lại nếu người dùng cấu hình nhầm cổng của Redis (6379) vào URL của Judge0
if "6379" in settings.JUDGE0_API_URL or settings.JUDGE0_API_URL.startswith("redis://"):
    settings.JUDGE0_API_URL = "http://localhost:2358"
if "6379" in settings.JUDGE0_SERVER_URL or settings.JUDGE0_SERVER_URL.startswith("redis://"):
    settings.JUDGE0_SERVER_URL = "http://localhost:2358"
if "6379" in settings.SANDBOX_URL or settings.SANDBOX_URL.startswith("redis://"):
    settings.SANDBOX_URL = "http://localhost:2358"

# Phòng thủ: Tự động sửa lại nếu người dùng cấu hình nhầm cổng của Judge0 (2358) vào URL của Redis
if "2358" in settings.REDIS_URL or settings.REDIS_URL.startswith("http://"):
    settings.REDIS_URL = "redis://localhost:6379/0"
if "2358" in settings.CELERY_BROKER_URL or settings.CELERY_BROKER_URL.startswith("http://"):
    settings.CELERY_BROKER_URL = "redis://localhost:6379/0"
if "2358" in settings.CELERY_RESULT_BACKEND or settings.CELERY_RESULT_BACKEND.startswith("http://"):
    settings.CELERY_RESULT_BACKEND = "redis://localhost:6379/0"

# Phòng thủ siêu việt: Tự động chuyển đổi localhost -> host.docker.internal khi ứng dụng chạy trong Docker container
import os
if os.path.exists("/.dockerenv") or os.environ.get("RUNNING_IN_DOCKER"):
    if "localhost" in settings.JUDGE0_API_URL:
        settings.JUDGE0_API_URL = settings.JUDGE0_API_URL.replace("localhost", "host.docker.internal")
    if "localhost" in settings.JUDGE0_SERVER_URL:
        settings.JUDGE0_SERVER_URL = settings.JUDGE0_SERVER_URL.replace("localhost", "host.docker.internal")
    if "localhost" in settings.SANDBOX_URL:
        settings.SANDBOX_URL = settings.SANDBOX_URL.replace("localhost", "host.docker.internal")
