from supabase import create_client, Client
from app.core.config import settings

supabase: Client = None
if settings.supabase_url and settings.get_service_key:
    supabase = create_client(settings.supabase_url, settings.get_service_key)

