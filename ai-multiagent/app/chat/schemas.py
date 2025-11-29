"""Request/response schemas for the chat API."""
from typing import Optional

from pydantic import BaseModel, Field


class MessageRequest(BaseModel):
    """Request body for the /message endpoint."""

    phone: str = Field(..., description="Patient phone number")
    message: str = Field(..., description="Message content")


class CheckinRequest(BaseModel):
    """Request body for the /checkin endpoint."""

    phone: str = Field(..., description="Patient phone number")


class MessageResponse(BaseModel):
    """Response from the chat system."""

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

