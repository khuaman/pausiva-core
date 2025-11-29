"""
Pausiva AI Multiagent API Server.

FastAPI application with LangGraph-based chat orchestration.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import app_router
from app.lifespan import lifespan
from app.shared.config import get_settings

settings = get_settings()

app = FastAPI(
    title="Pausiva API",
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

# Include routers
app.include_router(app_router)


@app.get("/")
async def root():
    """Root endpoint - redirect to docs."""
    return {"message": "Pausiva API", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.ENVIRONMENT == "local",
    )

