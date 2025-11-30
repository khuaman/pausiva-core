"""Request/response schemas for the chat API."""

import uuid
from typing import Optional

from pydantic import BaseModel, Field


class MessageRequest(BaseModel):
    """Request body for the /message endpoint."""

    thread_id: str = Field(
        ...,
        description="Conversation session ID (created by client for checkpointing)",
    )
    message_id: str = Field(
        description="Message ID for tracing (auto-generated if not provided)",
        default_factory=lambda: str(uuid.uuid4()),
    )
    phone: str = Field(
        ...,
        description="Patient phone number (for context/personalization)",
    )
    message: str = Field(..., description="Message content")


class CheckinRequest(BaseModel):
    """Request body for the /checkin endpoint."""

    thread_id: str = Field(
        ...,
        description="Conversation session ID (created by client for checkpointing)",
    )
    message_id: str = Field(
        description="Message ID for tracing (auto-generated if not provided)",
        default_factory=lambda: str(uuid.uuid4()),
    )
    phone: str = Field(
        ...,
        description="Patient phone number (for context/personalization)",
    )


class MessageResponse(BaseModel):
    """Response from the chat system."""

    thread_id: str = Field(..., description="Conversation session ID")
    message_id: str = Field(..., description="Message ID (from request or auto-generated)")
    reply_text: str = Field(..., description="Response text to send to patient")
    actions: list[str] = Field(default_factory=lambda: ["SEND_MESSAGE"])
    risk_level: str = Field(default="none")
    risk_score: int = Field(default=0)
    symptom_summary: str = Field(default="")
    medication_schedule: list[dict] = Field(default_factory=list)
    appointments: list[dict] = Field(default_factory=list)
    follow_up_questions: list[str] = Field(default_factory=list)
    agent_used: Optional[str] = None


class ContextResponse(BaseModel):
    """Response for patient context."""

    patient: Optional[dict] = None
    active_medications: list[dict] = Field(default_factory=list)
    upcoming_appointments: list[dict] = Field(default_factory=list)
    recent_symptoms: list[dict] = Field(default_factory=list)
    conversation_summary: str = ""


class StorageStatusResponse(BaseModel):
    """Response for storage status."""

    mode: str
    supabase_configured: bool
    supabase_url: Optional[str] = None
