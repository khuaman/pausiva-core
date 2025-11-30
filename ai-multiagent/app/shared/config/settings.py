"""
Application settings using Pydantic Settings.
Loads configuration from environment variables.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict

type Environment = Literal["local", "staging", "production"]


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Environment
    ENVIRONMENT: Environment = "local"

    # Google AI (Gemini)
    GOOGLE_API_KEY: str = Field(default="", description="Google AI API Key for Gemini")

    # OpenAI
    OPENAI_API_KEY: str = Field(default="", description="OpenAI API Key")

    # LangSmith Tracing (https://smith.langchain.com)
    # Set LANGCHAIN_TRACING_V2=true to enable tracing
    LANGCHAIN_TRACING_V2: bool = Field(
        default=False,
        description="Enable LangSmith tracing",
    )
    LANGCHAIN_API_KEY: str = Field(
        default="",
        description="LangSmith API key from https://smith.langchain.com",
    )
    LANGCHAIN_PROJECT: str = Field(
        default="pausiva-chat",
        description="LangSmith project name for organizing traces",
    )
    LANGCHAIN_ENDPOINT: str = Field(
        default="https://api.smith.langchain.com",
        description="LangSmith API endpoint",
    )

    # Supabase
    SUPABASE_URL: str = Field(default="", description="Supabase project URL")
    SUPABASE_SERVICE_KEY: str = Field(default="", description="Supabase service role key")
    SUPABASE_ANON_KEY: str = Field(default="", description="Supabase anonymous key")

    @computed_field
    @property
    def supabase_configured(self) -> bool:
        """Check if Supabase is properly configured."""
        return bool(self.SUPABASE_URL and (self.SUPABASE_SERVICE_KEY or self.SUPABASE_ANON_KEY))

    @computed_field
    @property
    def supabase_key(self) -> str:
        """Get the appropriate Supabase key (service key preferred)."""
        return self.SUPABASE_SERVICE_KEY or self.SUPABASE_ANON_KEY

    @computed_field
    @property
    def langsmith_configured(self) -> bool:
        """Check if LangSmith tracing is properly configured."""
        return bool(self.LANGCHAIN_TRACING_V2 and self.LANGCHAIN_API_KEY)


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
