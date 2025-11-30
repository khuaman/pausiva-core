"""FastAPI dependencies for Chat V2."""

from typing import Annotated

from fastapi import Depends, Request

from .service import ChatServiceV2


async def get_chat_service_v2(request: Request) -> ChatServiceV2:
    """
    Get the ChatServiceV2 instance from app state.

    The graph is compiled during app startup in lifespan.py.
    """
    graph = request.app.state.chat_v2_graph
    return ChatServiceV2(graph=graph)


ChatServiceV2Dep = Annotated[ChatServiceV2, Depends(get_chat_service_v2)]
