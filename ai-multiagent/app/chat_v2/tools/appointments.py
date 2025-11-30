"""Appointment management tools for Chat V2 agent."""

from typing import Optional

from langchain_core.tools import tool

from app.shared.database import AppointmentRepository, PatientRepository


@tool
def get_appointments(
    phone: str,
    include_past: bool = False,
    limit: int = 10,
) -> list[dict]:
    """Get a list of appointments for a patient.

    WHEN TO USE THIS vs get_next_appointment:
    - Use get_appointments when patient asks for "todas mis citas", "mis citas", "history"
    - Use get_next_appointment when patient asks "¿cuándo es mi próxima cita?"

    USER INTENT MAPPING:
    - "¿Cuáles son mis citas?" → get_appointments(phone, include_past=False)
    - "Mis citas pasadas" / "historial de citas" → get_appointments(phone, include_past=True)
    - "¿Tengo alguna cita?" → get_appointments(phone, include_past=False, limit=5)

    RETURNS a list of appointments with:
    - id: appointment UUID
    - scheduled_at: datetime of appointment
    - type: "pre_consulta" (free initial) or "consulta" (regular)
    - status: "scheduled", "completed", "cancelled", "no_show", "rescheduled"
    - doctor info: specialty, name
    - notes: any notes from the appointment

    IMPORTANT:
    - Results are ordered by scheduled_at (most recent first for past, soonest first for upcoming)
    - Empty list means no appointments found (patient may be new or hasn't scheduled yet)
    - For new patients in onboarding, they won't have appointments until FLUJO 1.3 completes

    Args:
        phone: Patient phone number
        include_past: False = only upcoming appointments (default), True = include completed/past
        limit: Maximum number to return (default 10, increase if patient asks for "all")
    """
    patient_repo = PatientRepository()
    appointment_repo = AppointmentRepository()

    # Look up patient
    patient = patient_repo.get_by_phone(phone)
    if not patient:
        return []

    return appointment_repo.get_by_patient(
        patient_id=patient["id"],
        include_past=include_past,
        limit=limit,
    )


@tool
def get_next_appointment(phone: str) -> Optional[dict]:
    """Get ONLY the next upcoming appointment for a patient.

    WHEN TO USE THIS vs get_appointments:
    - Use get_next_appointment for: "¿cuándo es mi próxima cita?", "mi siguiente cita"
    - Use get_appointments for: "todas mis citas", "mis citas", wanting a list

    USER INTENT MAPPING:
    - "¿Cuándo es mi cita?" → get_next_appointment(phone)
    - "¿Tengo cita pronto?" → get_next_appointment(phone)
    - "Mi próxima consulta" → get_next_appointment(phone)

    RETURNS:
    - Single appointment dict if found (scheduled_at, type, status, doctor info)
    - None if no upcoming appointments

    RESPONSE GUIDANCE based on result:
    - If appointment found: "Tu próxima cita es el {fecha} a las {hora} con {especialista}"
    - If None AND onboarding incomplete: Guide them to schedule via Taycal
    - If None AND onboarding complete: "No tienes citas programadas. ¿Te gustaría agendar una?"

    Args:
        phone: Patient phone number
    """
    patient_repo = PatientRepository()
    appointment_repo = AppointmentRepository()

    # Look up patient
    patient = patient_repo.get_by_phone(phone)
    if not patient:
        return None

    appointments = appointment_repo.get_by_patient(
        patient_id=patient["id"],
        include_past=False,
        limit=1,
    )
    return appointments[0] if appointments else None


@tool
def create_appointment_request(
    phone: str,
    requested_date: Optional[str] = None,
    requested_time: Optional[str] = None,
    specialist_type: Optional[str] = None,
    reason: Optional[str] = None,
) -> dict:
    """Create a request for a new appointment (records intent for staff follow-up).

    WHEN TO USE:
    - Patient explicitly asks to schedule an appointment: "quiero una cita", "necesito consulta"
    - After symptom assessment recommends scheduling (MEDIUM risk in FLUJO 6)
    - NOT during initial onboarding (onboarding uses Taycal link directly)

    DATE/TIME HANDLING - preserve natural language:
    - "la próxima semana" → requested_date="próxima semana"
    - "el lunes" → requested_date="lunes"
    - "15 de enero" → requested_date="2025-01-15" (convert if specific)
    - "en la mañana" → requested_time="mañana"
    - "por la tarde" → requested_time="tarde"
    - "a las 10" → requested_time="10:00"
    - If unclear or not specified → leave as None, don't assume

    SPECIALIST TYPES:
    - "ginecólogo" / "ginecóloga" - for menopause symptoms, hormonal treatment
    - "nutricionista" - for diet and nutrition plans
    - "psicóloga" - for emotional support, anxiety, depression
    - "general" - if not specified or unclear

    IMPORTANT:
    - This creates a REQUEST, not an actual appointment
    - Staff will follow up to confirm the actual date/time
    - Response should set expectation: "Te contactaremos para confirmar"
    - For MVP, actual scheduling is done via Taycal or staff

    Args:
        phone: Patient phone number
        requested_date: Preferred date - YYYY-MM-DD if specific, natural language otherwise
        requested_time: Preferred time - HH:MM if specific, or "mañana"/"tarde"/"noche"
        specialist_type: "ginecólogo", "nutricionista", "psicóloga", or "general"
        reason: Brief reason extracted from conversation (symptoms, follow-up, etc.)
    """
    patient_repo = PatientRepository()
    patient = patient_repo.get_by_phone(phone)

    return {
        "status": "request_created",
        "patient_id": patient["id"] if patient else None,
        "patient_name": patient.get("name") if patient else None,
        "requested_date": requested_date,
        "requested_time": requested_time,
        "specialist_type": specialist_type,
        "reason": reason,
        "message": (
            "Tu solicitud de cita ha sido registrada. "
            "Te contactaremos pronto para confirmar la fecha y hora."
        ),
    }


@tool
def get_appointment_info(phone: str, appointment_id: str) -> Optional[dict]:
    """Get detailed information about a specific appointment by ID.

    WHEN TO USE:
    - When you already have an appointment_id from a previous query
    - When patient asks about a specific appointment from a list
    - When you need full details including notes and plan info

    TYPICAL FLOW:
    1. get_appointments() → get list with IDs
    2. Patient asks about specific one → get_appointment_info(phone, appointment_id)

    RETURNS full appointment details:
    - scheduled_at, type, status
    - doctor info (name, specialty)
    - notes from the consultation
    - associated plan info if any

    IMPORTANT:
    - Validates that the appointment belongs to the patient (security)
    - Returns None if appointment doesn't exist or doesn't belong to patient

    Args:
        phone: Patient phone number (for validation that appointment belongs to them)
        appointment_id: UUID of the specific appointment
    """
    patient_repo = PatientRepository()
    appointment_repo = AppointmentRepository()

    # Look up patient
    patient = patient_repo.get_by_phone(phone)
    if not patient:
        return None

    return appointment_repo.get_by_id(appointment_id, patient_id=patient["id"])


@tool
def cancel_appointment_request(
    phone: str,
    appointment_id: str,
    reason: Optional[str] = None,
) -> dict:
    """Request cancellation of an existing appointment.

    WHEN TO USE:
    - Patient explicitly says: "quiero cancelar mi cita", "no puedo ir a mi cita"
    - Patient asks to reschedule (cancel + create new request)

    BEFORE CALLING:
    1. Confirm which appointment they want to cancel (use get_appointments if unclear)
    2. Confirm the patient really wants to cancel (don't assume)
    3. Ask for reason if not provided (helps staff understand)

    REASON EXTRACTION:
    - "No puedo ir ese día" → reason="No disponible en fecha programada"
    - "Me siento mejor, no necesito" → reason="Paciente indica mejoría"
    - "Tengo otro compromiso" → reason="Conflicto de horario"
    - If no reason given → leave as None, it's optional

    IMPORTANT:
    - This creates a CANCELLATION REQUEST, staff may need to confirm
    - Response should acknowledge and set expectation for confirmation
    - After cancelling, ask if they want to reschedule for another date

    RESPONSE PATTERN:
    "Tu solicitud de cancelación ha sido registrada. ¿Te gustaría reagendar para otra fecha?"

    Args:
        phone: Patient phone number
        appointment_id: UUID of the appointment to cancel (get from get_appointments)
        reason: Brief reason for cancellation (optional but helpful)
    """
    patient_repo = PatientRepository()
    patient = patient_repo.get_by_phone(phone)

    return {
        "status": "cancellation_requested",
        "appointment_id": appointment_id,
        "patient_id": patient["id"] if patient else None,
        "reason": reason,
        "message": (
            "Tu solicitud de cancelación ha sido registrada. Recibirás confirmación pronto."
        ),
    }


# Export all tools
APPOINTMENT_TOOLS = [
    get_appointments,
    get_next_appointment,
    create_appointment_request,
    get_appointment_info,
    cancel_appointment_request,
]
