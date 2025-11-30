"""Application lifecycle management."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import TypedDict

from fastapi import FastAPI
from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph.state import CompiledStateGraph

from app.chat.orchestrator import graph_builder
from app.chat_v2.agent import compile_graph as compile_v2_graph
from app.shared.config import get_settings


class LifespanState(TypedDict):
    """State available in request.state during app lifetime."""

    chat_graph: CompiledStateGraph
    chat_v2_graph: CompiledStateGraph


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

    # Create checkpointers for conversation memory
    # Using MemorySaver for development - in production use PostgresSaver
    # from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
    checkpointer_v1 = MemorySaver()
    checkpointer_v2 = MemorySaver()

    # Compile V1 graph (multi-agent orchestrator)
    chat_graph = graph_builder.compile(checkpointer=checkpointer_v1)
    print("✓ Chat V1 graph compiled with checkpointer (MemorySaver)")

    # Compile V2 graph (single agent with tools)
    chat_v2_graph = compile_v2_graph(checkpointer=checkpointer_v2)
    print("✓ Chat V2 graph compiled with checkpointer (MemorySaver)")

    # Explicitly set on app.state for dependencies to access via request.app.state
    app.state.chat_graph = chat_graph
    app.state.chat_v2_graph = chat_v2_graph

    yield LifespanState(chat_graph=chat_graph, chat_v2_graph=chat_v2_graph)

    # Shutdown
    print("Shutting down Pausiva API")
