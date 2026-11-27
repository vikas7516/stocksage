from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional

_ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    supabase_url: Optional[str] = None
    supabase_service_key: Optional[str] = None
    supabase_service_role_key: Optional[str] = None
    supabase_secret_key: Optional[str] = None
    supabase_anon_key: Optional[str] = None
    supabase_publishable_key: Optional[str] = None
    supabase_jwt_secret: Optional[str] = None
    frontend_url: str = "http://localhost:5173"
    environment: str = "development"
    groq_api_key: Optional[str] = None
    groq_model: str = "qwen/qwen3.8-27b"

    @property
    def get_service_key(self) -> str:
        return (
            self.supabase_service_role_key
            or self.supabase_service_key
            or self.supabase_secret_key
            or self.supabase_anon_key
            or self.supabase_publishable_key
            or ""
        )

    class Config:
        env_file = str(_ENV_PATH) if _ENV_PATH.exists() else ".env"
        extra = "allow"


settings = Settings()
