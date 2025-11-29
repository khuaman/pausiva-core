"""Appointments agent node - Appointment management."""
from langchain_core.messages import AIMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate

from app.models import RiskLevel
from app.shared.llm import get_chat_model

from ..core.prompts import APPOINTMENTS_PROMPT, BASE_SYSTEM_PROMPT
from ..core.schemas import OverallState

# Appointment keywords
APPOINTMENT_KEYWORDS = [
    "cita",
    "consulta",
    "hora",
    "turno",
    "agendar",
    "reservar",
    "doctor",
    "doctora",
    "médico",
    "médica",
    "especialista",
    "ginecólogo",
    "ginecóloga",
    "cancelar",
    "reagendar",
    "cambiar",
    "confirmar",
    "hospital",
    "clínica",
    "centro médico",
]


def has_appointment_keywords(message: str) -> bool:
    """Check if message contains appointment-related keywords."""
    message_lower = message.lower()
    return any(keyword in message_lower for keyword in APPOINTMENT_KEYWORDS)


async def appointments_node(state: OverallState) -> dict:
    """
    Appointments agent node - Manages medical appointments.
    """
    model = get_chat_model(temperature=0.5)

    # Build context message
    context_parts = ["[CONTEXTO DE LA PACIENTE]:"]
    appointments_info = ""

    if state.patient_context:
        context_parts.append(f"Teléfono: {state.patient_context.phone_number}")

        if state.patient_context.upcoming_appointments:
            appointments_info = "\nCITAS PRÓXIMAS:\n"
            for apt in state.patient_context.upcoming_appointments[:5]:
                date = apt.get("date", "")
                time = apt.get("time", "")
                specialist = apt.get("specialist_type", apt.get("type", "Consulta"))
                apt_id = apt.get("id", apt.get("appointment_id", ""))
                appointments_info += f"- {date} {time}: {specialist} (ID: {apt_id})\n"
        else:
            appointments_info = "\nNo hay citas próximas registradas.\n"

    context_message = "\n".join(context_parts)

    # Get the last human message
    last_message = ""
    for msg in reversed(state.messages):
        if isinstance(msg, HumanMessage):
            last_message = msg.content
            break

    # Build prompt
    additional_prompt = f"""
{appointments_info}

ANALIZA el mensaje de la paciente:
1. Si menciona una cita existente, usa la información del contexto.
2. Si quiere agendar una nueva cita, extrae fecha, hora y especialidad.
3. Determina la acción: REMIND, CONFIRM, CANCEL_REQUEST, RESCHEDULE_REQUEST.
4. NO inventes fechas ni horarios que no estén en el contexto o mensaje.
5. Incluye SCHEDULE_APPOINTMENT_REMINDERS en actions si es relevante.
"""

    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", f"{BASE_SYSTEM_PROMPT}\n\n{APPOINTMENTS_PROMPT}"),
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
        "agent_used": "appointments",
    }

