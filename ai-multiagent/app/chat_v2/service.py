"""Business logic for Chat V2 service."""

from langchain_core.messages import AIMessage, HumanMessage
from langgraph.graph.state import CompiledStateGraph

from app.models import RiskLevel
from app.shared.database import PatientRepository

from .schemas import MessageResponse


class ChatServiceV2:
    """Service for processing chat messages with single agent + tools pattern."""

    def __init__(self, graph: CompiledStateGraph):
        self.graph = graph
        self.patient_repo = PatientRepository()

    async def process_message(
        self,
        thread_id: str,
        message_id: str,
        phone: str,
        message: str,
        user_id: str | None = None,
        is_new_conversation: bool = False,
    ) -> MessageResponse:
        """
        Process an incoming message from a patient.

        Args:
            thread_id: Conversation session ID (for checkpointing)
            message_id: Message ID for tracing
            phone: Patient phone number
            message: Message content
            user_id: Optional user ID for authenticated users
            is_new_conversation: Whether this is a new conversation

        Returns:
            MessageResponse with the reply and metadata
        """
        # Check if patient exists
        patient_data = self.patient_repo.get_by_phone(phone)
        is_new_patient = patient_data is None

        # Create HumanMessage with assigned message_id
        human_message = HumanMessage(content=message)
        human_message.id = message_id

        # Run the graph with context
        result = await self.graph.ainvoke(
            {
                "messages": [human_message],
                "phone_number": phone,
                "is_new_patient": is_new_patient,
                "is_new_conversation": is_new_conversation,
                "patient_data": patient_data,
                "user_id": user_id,
                "conversation_id": thread_id,  # Pass thread_id as conversation_id for CMS
            },
            config={
                "configurable": {"thread_id": thread_id},
                "run_name": "Pausiva Chat V2",
                "tags": ["whatsapp", "patient", f"phone:{phone}", "v2"],
            },
        )

        # Extract the response
        reply_text = ""
        for msg in reversed(result.get("messages", [])):
            if isinstance(msg, AIMessage):
                reply_text = msg.content
                break

        return MessageResponse(
            thread_id=thread_id,
            message_id=message_id,
            reply_text=reply_text,
            actions=result.get("actions", ["SEND_MESSAGE"]),
            risk_level=result.get("risk_level", RiskLevel.NONE),
            risk_score=result.get("risk_score", 0),
            symptom_summary=result.get("symptom_summary", ""),
            appointments=result.get("appointments", []),
            follow_up_questions=result.get("follow_up_questions", []),
            agent_used="chat_v2",
            is_new_patient=is_new_patient,
            onboarding_state=result.get("onboarding_state"),
        )
