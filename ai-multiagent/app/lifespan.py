"""Application lifecycle management."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import TypedDict

from fastapi import FastAPI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph.state import CompiledStateGraph

from app.chat.orchestrator import graph_builder
from app.shared.config import get_settings


class LifespanState(TypedDict):
    """State available in request.state during app lifetime."""

    chat_graph: CompiledStateGraph


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[LifespanState, None]:
    """
    Application lifespan context manager.

    Handles startup and shutdown events.
    Sets up the checkpointer for conversation memory.
    """
    # Startup
    settings = get_settings()
    print(f"Starting Pausiva API in {settings.ENVIRONMENT} mode")

    # Log LangSmith tracing status
    if settings.langsmith_configured:
        print(f"✓ LangSmith tracing enabled → project: {settings.LANGCHAIN_PROJECT}")
    else:
        print("○ LangSmith tracing disabled (set LANGCHAIN_TRACING_V2=true and LANGCHAIN_API_KEY)")

    # Create checkpointer for conversation memory
    # Using MemorySaver for development - in production use PostgresSaver
    # from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
    checkpointer = MemorySaver()

    # Compile graph with checkpointer
    chat_graph = graph_builder.compile(checkpointer=checkpointer)
    print("✓ Chat graph compiled with checkpointer (MemorySaver)")

    # Explicitly set on app.state for dependencies to access via request.app.state
    app.state.chat_graph = chat_graph

    yield LifespanState(chat_graph=chat_graph)

    # Shutdown
    print("Shutting down Pausiva API")
