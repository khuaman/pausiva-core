"""Supabase client configuration and initialization."""

from typing import Optional

try:
    from supabase import Client, create_client

    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = None  # type: ignore

from app.shared.config import get_settings


class SupabaseClient:
    """Singleton wrapper for Supabase client."""

    _instance: Optional[Client] = None
    _initialized: bool = False

    @classmethod
    def get_client(cls) -> Optional[Client]:
        """
        Returns the Supabase client instance.
        Returns None if Supabase is not configured or not available.
        """
        if not SUPABASE_AVAILABLE:
            return None

        if not cls._initialized:
            cls._initialize()

        return cls._instance

    @classmethod
    def _initialize(cls) -> None:
        """Initialize Supabase client from settings."""
        cls._initialized = True

        settings = get_settings()

        if not settings.supabase_configured:
            cls._instance = None
            return

        try:
            cls._instance = create_client(settings.SUPABASE_URL, settings.supabase_key)
        except Exception as e:
            print(f"Warning: Could not initialize Supabase client: {e}")
            cls._instance = None

    @classmethod
    def is_available(cls) -> bool:
        """Check if Supabase is properly configured and available."""
        return cls.get_client() is not None

    @classmethod
    def reset(cls) -> None:
        """Reset the client (useful for testing)."""
        cls._instance = None
        cls._initialized = False


def get_supabase_client() -> Optional[Client]:
    """Convenience function to get Supabase client."""
    return SupabaseClient.get_client()
