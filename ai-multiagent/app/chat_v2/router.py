"""FastAPI router for Chat V2 API."""

from fastapi import APIRouter, HTTPException

from .dependencies import ChatServiceV2Dep
from .schemas import MessageRequest, MessageResponse

router = APIRouter(tags=["Chat V2"])


@router.post("/message", response_model=MessageResponse)
async def process_message(
    request: MessageRequest,
    service: ChatServiceV2Dep,
) -> MessageResponse:
    """
    Process a message from a patient using the V2 single-agent architecture.

    This endpoint uses a single LLM with tools instead of multiple specialized agents.
    The LLM decides which tools to call based on the conversation context.

    Identifiers:
    - thread_id: Conversation session ID (for checkpointing/memory)
    - message_id: Message ID for tracing (auto-generated if not provided)
    - phone: Patient identifier (for context/personalization)

    Args:
        request: Message request with thread_id, message_id, phone, and message
        service: Injected chat service

    Returns:
        MessageResponse with the reply and metadata
    """
    try:
        response = await service.process_message(
            thread_id=request.thread_id,
            message_id=request.message_id,
            phone=request.phone,
            message=request.message,
            user_id=request.user_id,
            is_new_conversation=request.is_new_conversation,
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

