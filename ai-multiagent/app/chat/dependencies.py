"""FastAPI dependency injection for the chat module."""
from typing import Annotated

from fastapi import Depends, Request
from langgraph.graph.state import CompiledStateGraph

from .service import ChatService


async def get_compiled_graph(request: Request) -> CompiledStateGraph:
    """
    Get the compiled graph from app state.
    
    The graph is compiled with a checkpointer in lifespan.py
    and stored in app.state via the lifespan context.
    """
    return request.app.state.chat_graph


async def get_chat_service(
    graph: Annotated[CompiledStateGraph, Depends(get_compiled_graph)],
) -> ChatService:
    """
    Get the chat service with injected graph.
    
    This allows the service to use the checkpointer-enabled graph
    for conversation memory persistence.
    """
    return ChatService(graph=graph)


# Type alias for dependency injection
ChatServiceDep = Annotated[ChatService, Depends(get_chat_service)]

