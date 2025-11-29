"""Business logic for the chat service."""
from langchain_core.messages import AIMessage, HumanMessage

from app.models import AgentResponse, RiskLevel
from app.shared.database import PatientRepository

from .agents import generate_checkin_prompt
from .core.schemas import InputState, PatientContextData
from .core.types import MessageCategory
from .orchestrator import graph


class ChatService:
    """Service for processing chat messages."""

    def __init__(self):
        self.graph = graph
        self.patient_repo = PatientRepository()

    async def process_message(self, phone: str, message: str) -> AgentResponse:
        """
        Process an incoming message from a patient.

        Args:
            phone: Patient phone number
            message: Message content

        Returns:
            AgentResponse with the reply and metadata
        """
        # Build patient context
        patient_context = self._build_patient_context(phone)

        # Create input state
        input_state = InputState(
            messages=[HumanMessage(content=message)],
            phone_number=phone,
            category=MessageCategory.GENERAL,
        )

        # Run the graph
        result = await self.graph.ainvoke(
            {
                "messages": input_state.messages,
                "phone_number": phone,
                "category": MessageCategory.GENERAL,
                "patient_context": patient_context,
            }
        )

        # Extract the response
        reply_text = ""
        for msg in reversed(result.get("messages", [])):
            if isinstance(msg, AIMessage):
                reply_text = msg.content
                break

        return AgentResponse(
            reply_text=reply_text,
            actions=["SEND_MESSAGE"],
            risk_level=RiskLevel(result.get("risk_level", "none")),
            risk_score=result.get("risk_score", 0),
            symptom_summary=result.get("symptom_summary", ""),
            medication_schedule=result.get("medication_schedule", []),
            appointments=result.get("appointments", []),
            follow_up_questions=result.get("follow_up_questions", []),
            agent_used=result.get("agent_used"),
        )

    async def send_checkin(self, phone: str) -> AgentResponse:
        """
        Send a proactive check-in message to a patient.

        Args:
            phone: Patient phone number

        Returns:
            AgentResponse with the check-in message
        """
        checkin_message = generate_checkin_prompt()

        return AgentResponse(
            reply_text=checkin_message,
            actions=["SEND_MESSAGE"],
            risk_level=RiskLevel.NONE,
            risk_score=0,
            agent_used="checkin",
        )

    def get_patient_context(self, phone: str) -> dict:
        """
        Get the context for a patient.

        Args:
            phone: Patient phone number

        Returns:
            Dictionary with patient context
        """
        patient_data = self.patient_repo.get_by_phone(phone)

        return {
            "patient": patient_data,
            "active_medications": [],  # TODO: Load from storage
            "upcoming_appointments": [],  # TODO: Load from storage
            "recent_symptoms": [],  # TODO: Load from storage
            "conversation_summary": "",
        }

    def _build_patient_context(self, phone: str) -> PatientContextData:
        """Build patient context data for the graph."""
        patient_data = self.patient_repo.get_by_phone(phone)

        return PatientContextData(
            phone_number=phone,
            patient=None,  # TODO: Convert to Patient model
            active_medications=[],  # TODO: Load from storage
            upcoming_appointments=[],  # TODO: Load from storage
            recent_symptoms=[],  # TODO: Load from storage
            conversation_summary="",
        )


# Global service instance
chat_service = ChatService()


def get_chat_service() -> ChatService:
    """Get the chat service instance."""
    return chat_service

