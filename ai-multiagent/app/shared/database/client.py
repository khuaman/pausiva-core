"""Supabase client configuration and initialization."""

from typing import TYPE_CHECKING, Optional

from app.models.base import AI_SCHEMA

try:
    from supabase import Client, create_client

    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = None  # type: ignore

from app.shared.config import get_settings

if TYPE_CHECKING:
    from supabase import Client


class SupabaseClient:
    """Singleton wrapper for Supabase client with schema support."""

    _instance: Optional["Client"] = None
    _initialized: bool = False

    @classmethod
    def get_client(cls) -> Optional["Client"]:
        """
        Returns the Supabase client instance.

        Returns:
            Supabase client instance or None if not configured.
        """
        if not SUPABASE_AVAILABLE:
            return None

        if not cls._initialized:
            cls._initialize()

        return cls._instance

    @classmethod
    def _initialize(cls) -> None:
        """Initialize Supabase client."""
        cls._initialized = True

        settings = get_settings()

        if not settings.supabase_configured:
            cls._instance = None
            return

        try:
            cls._instance = create_client(
                settings.SUPABASE_URL,
                settings.supabase_key,
            )
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


def get_supabase_client() -> Optional["Client"]:
    """
    Convenience function to get Supabase client.

    For public schema (default), use directly:
        client.table("users").select("*").execute()

    For AI schema, use schema() method:
        client.schema("ai_multiagent").table("patients").select("*").execute()
    """
    return SupabaseClient.get_client()


class AISchemaClient:
    """
    Helper class for working with AI multiagent schema tables.

    Usage:
        ai_db = AISchemaClient()
        result = ai_db.table("patients").select("*").execute()
    """

    def __init__(self):
        self._client = get_supabase_client()

    @property
    def client(self) -> Optional["Client"]:
        """Get the underlying Supabase client."""
        return self._client

    def table(self, table_name: str):
        """
        Get a table reference in the AI schema.

        Args:
            table_name: Name of the table (without schema prefix)

        Returns:
            PostgREST query builder for the table
        """
        if not self._client:
            raise RuntimeError("Supabase client not initialized")
        return self._client.schema(AI_SCHEMA).table(table_name)

    def is_available(self) -> bool:
        """Check if the client is available."""
        return self._client is not None


def get_ai_db() -> AISchemaClient:
    """
    Convenience function to get AI schema database client.

    Usage:
        ai_db = get_ai_db()
        result = ai_db.table("patients").select("*").execute()
    """
    return AISchemaClient()
