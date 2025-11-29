"""Triage agent node - Risk classification."""
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate

from app.models import RiskLevel
from app.shared.llm import get_chat_model

from ..core.prompts import BASE_SYSTEM_PROMPT, TRIAGE_PROMPT
from ..core.schemas import OverallState

# Risk assessment keywords
HIGH_RISK_KEYWORDS = [
    "no puedo respirar",
    "dolor en el pecho",
    "dolor intenso",
    "sangrado",
    "desmayo",
    "suicid",
    "morir",
    "matar",
    "urgencia",
    "emergencia",
    "ayuda urgente",
]

MEDIUM_RISK_KEYWORDS = [
    "varios días",
    "empeora",
    "no mejora",
    "preocupa",
    "ansiedad",
    "depresión",
    "insomnio",
    "no puedo dormir",
    "efecto secundario",
    "reacción",
]

SYMPTOM_KEYWORDS = [
    "dolor",
    "molestia",
    "cansada",
    "cansancio",
    "fatiga",
    "mareo",
    "náusea",
    "fiebre",
    "mal",
    "síntoma",
]


def quick_assess(message: str) -> tuple[str, int]:
    """
    Quick risk assessment without full context.
    Returns (risk_level, risk_score).
    """
    message_lower = message.lower()

    # Check high risk
    for keyword in HIGH_RISK_KEYWORDS:
        if keyword in message_lower:
            return ("high", 85)

    # Check medium risk
    for keyword in MEDIUM_RISK_KEYWORDS:
        if keyword in message_lower:
            return ("medium", 50)

    # Check symptom mentions
    for keyword in SYMPTOM_KEYWORDS:
        if keyword in message_lower:
            return ("low", 25)

    return ("none", 0)


async def triage_node(state: OverallState) -> dict:
    """
    Triage agent node - Classifies risk level and responds empathetically.
    """
    model = get_chat_model(temperature=0.5)

    # Build context message
    context_parts = ["[CONTEXTO DE LA PACIENTE]:"]
    if state.patient_context:
        if state.patient_context.patient:
            context_parts.append(f"Teléfono: {state.patient_context.phone_number}")
        if state.patient_context.recent_symptoms:
            context_parts.append("\n== SÍNTOMAS RECIENTES ==")
            for sym in state.patient_context.recent_symptoms[:5]:
                summary = sym.get("summary", "")[:100]
                risk = sym.get("risk_level", "none")
                context_parts.append(f"- {summary} (riesgo: {risk})")

    context_message = "\n".join(context_parts)

    # Get the last human message
    last_message = ""
    for msg in reversed(state.messages):
        if isinstance(msg, HumanMessage):
            last_message = msg.content
            break

    # Quick assess for initial risk
    risk_level_str, risk_score = quick_assess(last_message)

    # Build prompt
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", f"{BASE_SYSTEM_PROMPT}\n\n{TRIAGE_PROMPT}"),
            ("human", "{context}\n\n[MENSAJE DE LA PACIENTE]: {message}"),
        ]
    )

    chain = prompt | model

    response = await chain.ainvoke({"context": context_message, "message": last_message})

    # Determine actions
    actions = ["SEND_MESSAGE"]
    if risk_level_str == "high":
        actions.append("OPEN_RISK_ALERT")

    return {
        "messages": [AIMessage(content=response.content)],
        "risk_level": RiskLevel(risk_level_str),
        "risk_score": risk_score,
        "agent_used": "triage",
        "symptom_summary": last_message[:200] if risk_level_str != "none" else "",
    }

