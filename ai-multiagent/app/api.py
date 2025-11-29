"""API router aggregation."""
from fastapi import APIRouter

from app.chat.router import router as chat_router
from app.health.router import router as health_router

# Main router
app_router = APIRouter()

# Include health router at root
app_router.include_router(health_router)

# Include chat router
app_router.include_router(chat_router, prefix="/chat")

