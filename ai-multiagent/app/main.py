"""
Pausiva AI Multiagent API Server.

FastAPI application with LangGraph-based chat orchestration.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.chat.router import router as chat_router
from app.chat_v2.router import router as chat_v2_router
from app.health.router import router as health_router
from app.lifespan import lifespan
from app.shared.config import get_settings

settings = get_settings()

app = FastAPI(
    title="Pausiva AI Multiagent API",
    description="Sistema multiagente de acompañamiento para mujeres 40-60 años",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENVIRONMENT == "local" else None,
    openapi_url="/openapi.json" if settings.ENVIRONMENT == "local" else None,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(health_router)

# Chat V1 (legacy multi-agent orchestrator)
app.include_router(chat_router, prefix="/v1/chat", tags=["Chat V1"])

# Chat V2 (single agent with tools)
app.include_router(chat_v2_router, prefix="/v2/chat", tags=["Chat V2"])


@app.get("/")
async def root():
    """Root endpoint - redirect to docs."""
    return {"message": "Pausiva AI Multiagent API", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8080,
        reload=settings.ENVIRONMENT == "local",
    )
