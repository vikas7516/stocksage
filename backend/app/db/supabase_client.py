import logging
from typing import Optional
from supabase import create_client, Client
from app.core.config import settings

logger = logging.getLogger(__name__)

supabase: Optional[Client] = None
if settings.supabase_url and settings.get_service_key:
    try:
        supabase = create_client(settings.supabase_url, settings.get_service_key)
    except Exception as exc:
        logger.warning(f"Failed to initialize Supabase client (check key format): {exc}")
        supabase = None
