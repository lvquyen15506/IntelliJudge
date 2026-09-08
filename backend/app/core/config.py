# SPDX-License-Identifier: MIT
# Copyright (c) 2026 La Văn Quyền. All rights reserved.
from typing import List
import os
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "IntelliJudge"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Database Configuration
    DATABASE_URL: str

    # Security Configuration
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    FIRST_SUPERUSER_PASSWORD: str = "IntelliJudge@123"

    # Redis & Celery Configuration
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Sandbox API Configuration (Judge0)
    JUDGE0_API_URL: str = "http://localhost:2358"
    JUDGE0_SERVER_URL: str = "http://localhost:2358"
    SANDBOX_URL: str = "http://localhost:2358"
    JUDGE0_API_KEY: str = ""
    JUDGE0_AUTH_HEADER: str = "X-Auth-Token"
    JUDGE0_AUTH_TOKEN: str = ""

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

    @field_validator("JUDGE0_API_URL", "JUDGE0_SERVER_URL", "SANDBOX_URL", mode="after")
    @classmethod
    def validate_judge0_urls(cls, v: str) -> str:
        if v.startswith("redis://"):
            raise ValueError(f"Invalid URL scheme for Judge0: {v}")
        if os.path.exists("/.dockerenv") or os.environ.get("RUNNING_IN_DOCKER"):
            if "localhost" in v or "host.docker.internal" in v:
                return "http://judge0-server-1:2358"
        return v

    @field_validator("REDIS_URL", "CELERY_BROKER_URL", "CELERY_RESULT_BACKEND", mode="after")
    @classmethod
    def validate_redis_urls(cls, v: str) -> str:
        if v.startswith("http://") or v.startswith("https://"):
            raise ValueError(f"Invalid URL scheme for Redis: {v}")
        return v


settings = Settings()
