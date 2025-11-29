"""Base state schemas for LangGraph."""
from typing import Annotated, Optional

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field

from app.models import Patient, RiskLevel

from .types import ConversationTopic, MessageCategory

# Message type with automatic deduplication
Messages = Annotated[list[BaseMessage], add_messages]


class ConversationState(BaseModel):
    """Current state of the conversation."""

    active_topic: ConversationTopic = ConversationTopic.NONE
    pending_question: Optional[str] = None
    pending_action: Optional[str] = None
    last_agent: Optional[str] = None
    turns_on_topic: int = 0
    awaiting_response: bool = False
    context_data: dict = Field(default_factory=dict)

    def set_topic(self, topic: ConversationTopic, agent: str | None = None) -> None:
        """Change the active conversation topic."""
        if self.active_topic != topic:
            self.active_topic = topic
            self.turns_on_topic = 0
        else:
            self.turns_on_topic += 1

        if agent:
            self.last_agent = agent

    def set_pending_question(self, question: str, action: str | None = None) -> None:
        """Mark that there is a pending question."""
        self.pending_question = question
        self.pending_action = action
        self.awaiting_response = True

    def clear_pending(self) -> None:
        """Clear the pending question/action."""
        self.pending_question = None
        self.pending_action = None
        self.awaiting_response = False


class PatientContextData(BaseModel):
    """Patient context data for agents."""

    phone_number: str
    patient: Optional[Patient] = None
    active_medications: list[dict] = Field(default_factory=list)
    upcoming_appointments: list[dict] = Field(default_factory=list)
    recent_symptoms: list[dict] = Field(default_factory=list)
    conversation_summary: str = ""


class InputState(BaseModel):
    """Input state for the graph."""

    messages: Messages
    phone_number: str
    category: MessageCategory = MessageCategory.GENERAL

    class Config:
        arbitrary_types_allowed = True


class OutputState(BaseModel):
    """Output state from the graph."""

    messages: Messages
    risk_level: RiskLevel = RiskLevel.NONE
    risk_score: int = 0
    agent_used: Optional[str] = None
    symptom_summary: str = ""
    medication_schedule: list[dict] = Field(default_factory=list)
    appointments: list[dict] = Field(default_factory=list)
    follow_up_questions: list[str] = Field(default_factory=list)

    class Config:
        arbitrary_types_allowed = True


class OverallState(InputState, OutputState):
    """Combined state for internal graph operations."""

    conversation_state: ConversationState = Field(default_factory=ConversationState)
    patient_context: Optional[PatientContextData] = None

    class Config:
        arbitrary_types_allowed = True


class ChatContext(BaseModel):
    """Runtime context for the chat graph."""

    phone_number: str
    patient_context: Optional[PatientContextData] = None
    conversation_state: ConversationState = Field(default_factory=ConversationState)

    class Config:
        arbitrary_types_allowed = True

