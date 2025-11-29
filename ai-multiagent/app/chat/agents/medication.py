"""Medication agent node - Medication reminders management."""
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate

from app.models import RiskLevel
from app.shared.llm import get_chat_model

from ..core.prompts import BASE_SYSTEM_PROMPT, MEDICATION_PROMPT
from ..core.schemas import OverallState

# Medication keywords
MEDICATION_KEYWORDS = [
    "receta",
    "medicamento",
    "pastilla",
    "tableta",
    "cápsula",
    "jarabe",
    "dosis",
    "tomar",
    "mg",
    "ml",
    "cada",
    "horas",
    "mañana",
    "noche",
    "antes",
    "después",
    "comida",
    "farmacia",
    "médico recetó",
    "me recetaron",
]


def has_medication_keywords(message: str) -> bool:
    """Check if message contains medication-related keywords."""
    message_lower = message.lower()
    return any(keyword in message_lower for keyword in MEDICATION_KEYWORDS)


async def medication_node(state: OverallState) -> dict:
    """
    Medication agent node - Manages medication reminders.
    """
    model = get_chat_model(temperature=0.3)

    # Build context message
    context_parts = ["[CONTEXTO DE LA PACIENTE]:"]
    if state.patient_context:
        context_parts.append(f"Teléfono: {state.patient_context.phone_number}")

        if state.patient_context.active_medications:
            context_parts.append("\n== MEDICACIÓN ACTIVA ==")
            for med in state.patient_context.active_medications[:5]:
                med_name = med.get("name", "Sin nombre")
                freq = med.get("frequency_text", "")
                context_parts.append(f"- {med_name}: {freq}")

    context_message = "\n".join(context_parts)

    # Get the last human message
    last_message = ""
    for msg in reversed(state.messages):
        if isinstance(msg, HumanMessage):
            last_message = msg.content
            break

    # Build prompt
    additional_prompt = """
ANALIZA el mensaje de la paciente:
1. Si envía una receta, extrae la información de cada medicamento.
2. Estructura el plan de recordatorios.
3. Si falta información (horarios, duración), pregunta de forma simple.
4. NO modifiques las dosis ni opines sobre los medicamentos.
5. Incluye SCHEDULE_MED_REMINDERS en actions si detectas nueva medicación.
"""

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", f"{BASE_SYSTEM_PROMPT}\n\n{MEDICATION_PROMPT}"),
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
        "agent_used": "medication",
    }

