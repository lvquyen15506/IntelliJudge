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

    # Sandbox API Configuration (Judge0)
    JUDGE0_API_URL: str = "http://localhost:2358"
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
