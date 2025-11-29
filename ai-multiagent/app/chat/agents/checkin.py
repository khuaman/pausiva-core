"""Checkin agent node - Daily wellness check-in."""
from datetime import datetime

from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate

from app.models import RiskLevel
from app.shared.llm import get_chat_model

from ..core.prompts import BASE_SYSTEM_PROMPT, CHECKIN_PROMPT
from ..core.schemas import OverallState

# Check-in response patterns
CHECKIN_PATTERNS = [
    "bien",
    "mal",
    "más o menos",
    "regular",
    "cansada",
    "dormí",
    "sueño",
    "energía",
    "ánimo",
    "hoy me siento",
    "estoy",
    "me siento",
    "amanecí",
    "desperté",
]


def is_checkin_response(message: str) -> bool:
    """Check if message is a response to a check-in question."""
    message_lower = message.lower()
    return any(pattern in message_lower for pattern in CHECKIN_PATTERNS)


def generate_checkin_prompt(hour: int | None = None) -> str:
    """Generate a proactive check-in message based on time of day."""
    if hour is None:
        hour = datetime.now().hour

    if 5 <= hour < 12:
        return "Buenos días. ¿Cómo amaneciste hoy? ¿Cómo dormiste anoche?"
    elif 12 <= hour < 19:
        return "Buenas tardes. ¿Cómo va tu día? ¿Algún síntoma o molestia que quieras reportar?"
    else:
        return "Buenas noches. ¿Cómo te sentiste hoy en general? ¿Cómo estuvo tu energía durante el día?"


async def checkin_node(state: OverallState) -> dict:
    """
    Checkin agent node - Daily wellness tracking.
    """
    model = get_chat_model(temperature=0.7)

    # Build context message
    context_parts = ["[CONTEXTO DE LA PACIENTE]:"]
    symptoms_info = ""

    if state.patient_context:
        context_parts.append(f"Teléfono: {state.patient_context.phone_number}")

        if state.patient_context.recent_symptoms:
            symptoms_info = "\nHISTORIAL RECIENTE DE SÍNTOMAS:\n"
            for entry in state.patient_context.recent_symptoms[-5:]:
                timestamp = entry.get("timestamp", "N/A")
                summary = entry.get("summary", "Sin resumen")
                risk = entry.get("risk_level", "none")
                symptoms_info += f"- {timestamp}: {summary} (Riesgo: {risk})\n"

    context_message = "\n".join(context_parts)

    # Get time-based greeting
    hour = datetime.now().hour
    if 5 <= hour < 12:
        greeting = "Buenos días."
    elif 12 <= hour < 19:
        greeting = "Buenas tardes."
    else:
        greeting = "Buenas noches."

    # Get the last human message
    last_message = ""
    for msg in reversed(state.messages):
        if isinstance(msg, HumanMessage):
            last_message = msg.content
            break

    # Build prompt
    additional_prompt = f"""
{symptoms_info}

MOMENTO DEL DÍA: {greeting}

ANALIZA el mensaje de la paciente:
1. Identifica cómo se siente hoy (físico y emocional).
2. Resume en "symptom_summary" los síntomas o estado reportado.
3. Valida sus emociones sin minimizar ni dramatizar.
4. Da recomendaciones generales de autocuidado si aplica.
5. Incluye UPDATE_SYMPTOM_TRACKING en actions.
6. Si menciona síntomas preocupantes, clasifica el riesgo apropiadamente.
"""

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", f"{BASE_SYSTEM_PROMPT}\n\n{CHECKIN_PROMPT}"),
            (
                "human",
                "{context}\n\n{additional}\n\n[MENSAJE DE LA PACIENTE]: {message}",
            ),
        ]
    )

    chain = prompt | model

    response = await chain.ainvoke(
        {
            "context": context_message,
            "additional": additional_prompt,
            "message": last_message,
        }
    )

    return {
        "messages": [AIMessage(content=response.content)],
        "risk_level": RiskLevel.NONE,
        "risk_score": 0,
        "agent_used": "checkin",
        "symptom_summary": last_message[:200] if is_checkin_response(last_message) else "",
    }

