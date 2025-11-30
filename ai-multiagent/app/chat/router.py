"""FastAPI router for the chat API."""

from fastapi import APIRouter, HTTPException

from app.shared.config import get_settings

from .dependencies import ChatServiceDep
from .schemas import (
    CheckinRequest,
    ContextResponse,
    MessageRequest,
    MessageResponse,
    StorageStatusResponse,
)

router = APIRouter(tags=["Chat"])


@router.post("/message", response_model=MessageResponse)
async def process_message(
    request: MessageRequest,
    service: ChatServiceDep,
) -> MessageResponse:
    """
    Process a message from a patient.

    Identifiers:
    - thread_id: Conversation session ID (for checkpointing/memory)
    - message_id: Message ID for tracing (auto-generated if not provided)
    - phone: Patient identifier (for context/personalization)

    Args:
        request: Message request with thread_id, message_id, phone, and message
        service: Injected chat service with checkpointer

    Returns:
        MessageResponse with the reply and metadata
    """
    try:
        response = await service.process_message(
            request.thread_id,
            request.message_id,
            request.phone,
            request.message,
        )
        return MessageResponse(
            thread_id=request.thread_id,
            message_id=request.message_id,
            reply_text=response.reply_text,
            actions=response.actions,
            risk_level=response.risk_level,  # Already a string due to use_enum_values=True
            risk_score=response.risk_score,
            symptom_summary=response.symptom_summary,
            medication_schedule=response.medication_schedule,
            appointments=response.appointments,
            follow_up_questions=response.follow_up_questions,
            agent_used=response.agent_used,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/checkin", response_model=MessageResponse)
async def send_checkin(
    request: CheckinRequest,
    service: ChatServiceDep,
) -> MessageResponse:
    """
    Send a proactive check-in message to a patient.

    Args:
        request: Check-in request with thread_id, message_id, and phone
        service: Injected chat service

    Returns:
        MessageResponse with the check-in message
    """
    try:
        response = await service.send_checkin(
            request.thread_id,
            request.message_id,
            request.phone,
        )
        return MessageResponse(
            thread_id=request.thread_id,
            message_id=request.message_id,
            reply_text=response.reply_text,
            actions=response.actions,
            risk_level=response.risk_level,  # Already a string due to use_enum_values=True
            risk_score=response.risk_score,
            agent_used=response.agent_used,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/context/{phone}", response_model=ContextResponse)
async def get_context(
    phone: str,
    service: ChatServiceDep,
) -> ContextResponse:
    """
    Get the context for a patient.

    Args:
        phone: Patient phone number
        service: Injected chat service

    Returns:
        ContextResponse with patient context
    """
    try:
        context = service.get_patient_context(phone)
        return ContextResponse(**context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/storage/status", response_model=StorageStatusResponse)
async def get_storage_status() -> StorageStatusResponse:
    """
    Get the storage status.

    Returns:
        StorageStatusResponse with storage mode and configuration
    """
    settings = get_settings()

    masked_url = None
    if settings.SUPABASE_URL:
        parts = settings.SUPABASE_URL.split(".")
        if len(parts) >= 2:
            masked_url = f"{parts[0][:12]}...{parts[-1]}"

    return StorageStatusResponse(
        mode="supabase" if settings.supabase_configured else "json",
        supabase_configured=settings.supabase_configured,
        supabase_url=masked_url,
    )
