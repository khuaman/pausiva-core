"""
Supabase client configuration and initialization.
"""
import os
from typing import Optional
from pathlib import Path

try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = None


def load_env():
    """Carga variables de entorno desde .env"""
    current = Path(__file__).parent
    for _ in range(6):
        env_path = current / ".env"
        if env_path.exists():
            with open(env_path) as f:
                for line in f:
                    if "=" in line and not line.startswith("#"):
                        key, value = line.strip().split("=", 1)
                        os.environ.setdefault(key, value)
            return
        current = current.parent


load_env()


class SupabaseClient:
    """
    Singleton wrapper for Supabase client.
    """
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
    def _initialize(cls):
        """Initialize Supabase client from environment variables."""
        cls._initialized = True
        
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
        
        if not url or not key:
            cls._instance = None
            return
        
        try:
            cls._instance = create_client(url, key)
        except Exception as e:
            print(f"Warning: Could not initialize Supabase client: {e}")
            cls._instance = None
    
    @classmethod
    def is_available(cls) -> bool:
        """Check if Supabase is properly configured and available."""
        return cls.get_client() is not None
    
    @classmethod
    def reset(cls):
        """Reset the client (useful for testing)."""
        cls._instance = None
        cls._initialized = False


def get_supabase_client() -> Optional[Client]:
    """Convenience function to get Supabase client."""
    return SupabaseClient.get_client()

