"""Agent response models."""
from typing import Optional

from pydantic import BaseModel, Field

from .patient import RiskLevel


class AgentResponse(BaseModel):
    """Structured response from the agent system."""

    reply_text: str
    actions: list[str] = Field(default_factory=lambda: ["SEND_MESSAGE"])
    risk_level: RiskLevel = RiskLevel.NONE
    risk_score: int = 0
    symptom_summary: str = ""
    medication_schedule: list[dict] = Field(default_factory=list)
    appointments: list[dict] = Field(default_factory=list)
    follow_up_questions: list[str] = Field(default_factory=list)
    agent_used: Optional[str] = None

    @classmethod
    def error_response(
        cls,
        message: str = "Hubo un problema procesando tu mensaje. Por favor, intenta de nuevo.",
    ) -> "AgentResponse":
        """Create a standard error response."""
        return cls(
            reply_text=message,
            actions=["SEND_MESSAGE"],
            risk_level=RiskLevel.NONE,
            risk_score=0,
        )

