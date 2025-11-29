from dataclasses import dataclass, field
from typing import Optional
from .patient import RiskLevel


@dataclass
class AgentResponse:
    """Respuesta estructurada del sistema de agentes."""
    reply_text: str
    actions: list[str] = field(default_factory=lambda: ["SEND_MESSAGE"])
    risk_level: RiskLevel = RiskLevel.NONE
    risk_score: int = 0
    symptom_summary: str = ""
    medication_schedule: list[dict] = field(default_factory=list)
    appointments: list[dict] = field(default_factory=list)
    follow_up_questions: list[str] = field(default_factory=list)
    agent_used: Optional[str] = None  # Qué agente procesó el mensaje
    
    def to_dict(self) -> dict:
        return {
            "reply_text": self.reply_text,
            "actions": self.actions,
            "risk_level": self.risk_level.value,
            "risk_score": self.risk_score,
            "symptom_summary": self.symptom_summary,
            "medication_schedule": self.medication_schedule,
            "appointments": self.appointments,
            "follow_up_questions": self.follow_up_questions,
            "agent_used": self.agent_used
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "AgentResponse":
        return cls(
            reply_text=data.get("reply_text", ""),
            actions=data.get("actions", ["SEND_MESSAGE"]),
            risk_level=RiskLevel(data.get("risk_level", "none")),
            risk_score=data.get("risk_score", 0),
            symptom_summary=data.get("symptom_summary", ""),
            medication_schedule=data.get("medication_schedule", []),
            appointments=data.get("appointments", []),
            follow_up_questions=data.get("follow_up_questions", []),
            agent_used=data.get("agent_used")
        )
    
    @classmethod
    def error_response(cls, message: str = "Hubo un problema procesando tu mensaje. Por favor, intenta de nuevo.") -> "AgentResponse":
        """Crea una respuesta de error estándar."""
        return cls(
            reply_text=message,
            actions=["SEND_MESSAGE"],
            risk_level=RiskLevel.NONE,
            risk_score=0
        )

