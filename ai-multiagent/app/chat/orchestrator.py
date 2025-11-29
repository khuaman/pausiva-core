"""
Pausiva Chat Orchestrator - LangGraph-based message routing.
"""
from typing import Literal

from langchain_core.messages import AIMessage, HumanMessage
from langgraph.graph import END, StateGraph

from app.models import RiskLevel

from .agents import (
    appointments_node,
    checkin_node,
    has_appointment_keywords,
    has_medication_keywords,
    is_checkin_response,
    medication_node,
    quick_assess,
    triage_node,
)
from .core.prompts import ResponseTemplates
from .core.schemas import InputState, OutputState, OverallState
from .core.types import ConversationTopic, MessageCategory


def classify_message(state: OverallState) -> dict:
    """
    Classify the incoming message to determine routing.
    """
    # Get the last human message
    last_message = ""
    for msg in reversed(state.messages):
        if isinstance(msg, HumanMessage):
            last_message = msg.content
            break

    message_lower = last_message.lower().strip()

    # Check for greetings
    greetings = ["hola", "buenos días", "buenas tardes", "buenas noches", "hi", "hello"]
    if message_lower in greetings or any(message_lower.startswith(g) for g in greetings):
        return {"category": MessageCategory.GREETING}

    # Check medication keywords
    if has_medication_keywords(last_message):
        return {"category": MessageCategory.MEDICATION}

    # Check appointment keywords
    if has_appointment_keywords(last_message):
        return {"category": MessageCategory.APPOINTMENTS}

    # Check if it's a check-in response
    if is_checkin_response(last_message):
        return {"category": MessageCategory.CHECKIN}

    # Check for symptoms/triage
    risk_level, _ = quick_assess(last_message)
    if risk_level in ["high", "medium", "low"]:
        return {"category": MessageCategory.TRIAGE}

    # Default to general/checkin
    return {"category": MessageCategory.GENERAL}


def route_by_category(
    state: OverallState,
) -> Literal["triage", "medication", "appointments", "checkin", "greeting", "general"]:
    """
    Route to the appropriate agent based on category.
    """
    # Always prioritize high risk
    last_message = ""
    for msg in reversed(state.messages):
        if isinstance(msg, HumanMessage):
            last_message = msg.content
            break

    risk_level, _ = quick_assess(last_message)
    if risk_level == "high":
        return "triage"

    category = state.category
    if category == MessageCategory.TRIAGE:
        return "triage"
    elif category == MessageCategory.MEDICATION:
        return "medication"
    elif category == MessageCategory.APPOINTMENTS:
        return "appointments"
    elif category == MessageCategory.CHECKIN:
        return "checkin"
    elif category == MessageCategory.GREETING:
        return "greeting"
    else:
        return "general"


async def greeting_node(state: OverallState) -> dict:
    """
    Handle greeting messages.
    """
    # Check if it's a new patient (no prior messages beyond the greeting)
    is_new = len([m for m in state.messages if isinstance(m, HumanMessage)]) <= 1

    if is_new:
        response_text = ResponseTemplates.WELCOME_NEW
    else:
        response_text = ResponseTemplates.WELCOME_RETURNING

    return {
        "messages": [AIMessage(content=response_text)],
        "risk_level": RiskLevel.NONE,
        "risk_score": 0,
        "agent_used": "orchestrator",
    }


async def general_node(state: OverallState) -> dict:
    """
    Handle general messages - routes to checkin as fallback.
    """
    # Use checkin agent as the default for general conversations
    return await checkin_node(state)


# Build the graph
graph_builder = StateGraph(
    state_schema=OverallState,
    input=InputState,
    output=OutputState,
)

# Add nodes
graph_builder.add_node("classify", classify_message)
graph_builder.add_node("triage", triage_node)
graph_builder.add_node("medication", medication_node)
graph_builder.add_node("appointments", appointments_node)
graph_builder.add_node("checkin", checkin_node)
graph_builder.add_node("greeting", greeting_node)
graph_builder.add_node("general", general_node)

# Set entry point
graph_builder.set_entry_point("classify")

# Add conditional edges from classify to agents
graph_builder.add_conditional_edges(
    "classify",
    route_by_category,
    {
        "triage": "triage",
        "medication": "medication",
        "appointments": "appointments",
        "checkin": "checkin",
        "greeting": "greeting",
        "general": "general",
    },
)

# All agents go to END
graph_builder.add_edge("triage", END)
graph_builder.add_edge("medication", END)
graph_builder.add_edge("appointments", END)
graph_builder.add_edge("checkin", END)
graph_builder.add_edge("greeting", END)
graph_builder.add_edge("general", END)

# Compile the graph
graph = graph_builder.compile(name="pausiva_chat")

