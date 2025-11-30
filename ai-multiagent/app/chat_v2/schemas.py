"""Request/response schemas for Chat V2 API."""

import uuid
from typing import Optional

from pydantic import BaseModel, Field


class MessageRequest(BaseModel):
    """Request body for the /v2/chat/message endpoint."""

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
    user_id: Optional[str] = Field(
        default=None,
        description="Optional user ID for authenticated users",
    )
    is_new_conversation: bool = Field(
        default=False,
        description="Whether this is the start of a new conversation",
    )


class MessageResponse(BaseModel):
    """Response from the chat V2 system."""

    thread_id: str = Field(..., description="Conversation session ID")
    message_id: str = Field(..., description="Message ID (from request or auto-generated)")
    reply_text: str = Field(..., description="Response text to send to patient")
    actions: list[str] = Field(default_factory=lambda: ["SEND_MESSAGE"])
    risk_level: str = Field(default="none")
    risk_score: int = Field(default=0)
    symptom_summary: str = Field(default="")
    appointments: list[dict] = Field(default_factory=list)
    follow_up_questions: list[str] = Field(default_factory=list)
    agent_used: str = Field(default="chat_v2")
    is_new_patient: bool = Field(
        default=False,
        description="Whether this is a new patient (no existing record)",
    )
    onboarding_state: Optional[str] = Field(
        default=None,
        description="Current onboarding state if applicable",
    )
