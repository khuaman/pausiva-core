"""Application lifecycle management."""
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.shared.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan context manager.

    Handles startup and shutdown events.
    """
    # Startup
    settings = get_settings()
    print(f"Starting Pausiva API in {settings.ENVIRONMENT} mode")

    yield

    # Shutdown
    print("Shutting down Pausiva API")

