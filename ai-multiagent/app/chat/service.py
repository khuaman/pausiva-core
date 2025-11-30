"""Business logic for the chat service."""

from typing import TYPE_CHECKING

from langchain_core.messages import AIMessage, HumanMessage
from langgraph.graph.state import CompiledStateGraph

from app.models import AgentResponse, RiskLevel
from app.shared.database import PatientRepository

from .agents import generate_checkin_prompt
from .core.schemas import InputState, PatientContextData
from .core.types import MessageCategory

if TYPE_CHECKING:
    pass


class ChatService:
    """Service for processing chat messages with conversation memory."""

    def __init__(
        self,
        graph: CompiledStateGraph,
    ):
        self.graph = graph
        self.patient_repo = PatientRepository()

    async def process_message(
        self, thread_id: str, message_id: str, phone: str, message: str
    ) -> AgentResponse:
        """
        Process an incoming message from a patient.

        Args:
            thread_id: Conversation session ID (for checkpointing)
            message_id: Message ID for tracing (assigned to HumanMessage)
            phone: Patient phone number (for context/personalization)
            message: Message content

        Returns:
            AgentResponse with the reply and metadata
        """
        # Build patient context using phone number
        patient_context = self._build_patient_context(phone)

        # Create HumanMessage with assigned message_id for tracing
        human_message = HumanMessage(content=message)
        human_message.id = message_id

        # Create input state
        input_state = InputState(
            messages=[human_message],
            thread_id=thread_id,
            phone_number=phone,
            category=MessageCategory.GENERAL,
        )

        # Run the graph with thread_id for conversation memory
        # thread_id is the session identifier, phone_number is for patient context
        result = await self.graph.ainvoke(
            {
                "messages": input_state.messages,
                "thread_id": thread_id,
                "phone_number": phone,
                "category": MessageCategory.GENERAL,
                "patient_context": patient_context,
            },
            config={
                "configurable": {"thread_id": thread_id},
                "run_name": "Pausiva Chat",
                "tags": ["whatsapp", "patient", f"phone:{phone}"],
            },
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

    async def send_checkin(
        self, thread_id: str, message_id: str, phone: str
    ) -> AgentResponse:
        """
        Send a proactive check-in message to a patient.

        Args:
            thread_id: Conversation session ID (for checkpointing)
            message_id: Message ID for tracing
            phone: Patient phone number (for context/personalization)

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
