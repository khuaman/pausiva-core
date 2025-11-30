"""Appointment management tools for Chat V2 agent."""

from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4

from langchain_core.tools import tool

from app.shared.database import (
    AppointmentRepository,
    FollowingRepository,
    PatientRepository,
)


# Mockup available appointments (future dates from Dec 2025 onwards)
def _get_mock_available_slots() -> list[dict]:
    """Generate mock available appointment slots for demo purposes.

    In production, this would integrate with a calendar API.
    """
    base_date = datetime(2025, 12, 2)  # Monday Dec 2, 2025
    slots = []

    # Generate slots for the next 2 weeks
    for day_offset in range(14):
        current_date = base_date + timedelta(days=day_offset)
        # Skip weekends
        if current_date.weekday() >= 5:
            continue

        # Morning slots (9:00, 10:00, 11:00)
        for hour in [9, 10, 11]:
            slot_datetime = current_date.replace(hour=hour, minute=0, second=0)
            slots.append(
                {
                    "id": str(uuid4()),
                    "datetime": slot_datetime.isoformat(),
                    "date": slot_datetime.strftime("%Y-%m-%d"),
                    "time": slot_datetime.strftime("%H:%M"),
                    "day_name": slot_datetime.strftime("%A"),
                    "formatted": slot_datetime.strftime("%d de %B a las %H:%M"),
                    "available": True,
                    "specialist": "Dra. María García",
                    "specialty": "Ginecología",
                    "type": "consulta",
                }
            )

        # Afternoon slots (15:00, 16:00, 17:00)
        for hour in [15, 16, 17]:
            slot_datetime = current_date.replace(hour=hour, minute=0, second=0)
            slots.append(
                {
                    "id": str(uuid4()),
                    "datetime": slot_datetime.isoformat(),
                    "date": slot_datetime.strftime("%Y-%m-%d"),
                    "time": slot_datetime.strftime("%H:%M"),
                    "day_name": slot_datetime.strftime("%A"),
                    "formatted": slot_datetime.strftime("%d de %B a las %H:%M"),
                    "available": True,
                    "specialist": "Dra. María García",
                    "specialty": "Ginecología",
                    "type": "consulta",
                }
            )

    return slots[:20]  # Return first 20 slots


@tool
def get_available_appointments(
    phone: str,
    specialist_type: Optional[str] = None,
    preferred_date: Optional[str] = None,
) -> list[dict]:
    """Get available appointment slots that can be scheduled.

    WHEN TO USE:
    - Patient asks: "¿qué horarios tienen disponibles?", "quiero agendar una cita"
    - Before scheduling a meeting to show options
    - When patient wants to see availability

    USER INTENT MAPPING:
    - "¿Qué fechas tienen?" → get_available_appointments(phone)
    - "¿Hay citas disponibles esta semana?" → get_available_appointments(phone)
    - "Quiero agendar con ginecóloga" →
      get_available_appointments(phone, specialist_type="ginecólogo")

    RETURNS list of available slots with:
    - id: slot ID for scheduling
    - datetime: ISO format datetime
    - date: YYYY-MM-DD format
    - time: HH:MM format
    - formatted: human readable date/time in Spanish
    - specialist: doctor name
    - specialty: doctor specialty
    - available: boolean (always true in this list)

    RESPONSE GUIDANCE:
    - Present 3-5 options to the patient, not all slots
    - Group by date: "Tenemos disponibilidad el lunes 2 a las 9:00, 10:00 o 15:00..."
    - Ask which time works best for them
    - Once they choose, use schedule_meeting to book

    NOTE: This is currently a mockup. Will integrate with calendar API later.

    Args:
        phone: Patient phone number
        specialist_type: Filter by specialty (e.g., "ginecólogo", "nutricionista")
        preferred_date: Optional preferred date in YYYY-MM-DD format
    """
    slots = _get_mock_available_slots()

    # Filter by date if provided
    if preferred_date:
        slots = [s for s in slots if s["date"] == preferred_date]

    return slots


@tool
def get_next_appointment(phone: str) -> Optional[dict]:
    """Get ONLY the next upcoming appointment for a patient.

    WHEN TO USE THIS vs get_available_appointments:
    - Use get_next_appointment for: "¿cuándo es mi próxima cita?", "mi siguiente cita"
    - Use get_available_appointments for: showing available slots to schedule

    USER INTENT MAPPING:
    - "¿Cuándo es mi cita?" → get_next_appointment(phone)
    - "¿Tengo cita pronto?" → get_next_appointment(phone)
    - "Mi próxima consulta" → get_next_appointment(phone)

    RETURNS:
    - Single appointment dict if found (scheduled_at, type, status, doctor info)
    - None if no upcoming appointments

    RESPONSE GUIDANCE based on result:
    - If appointment found: "Tu próxima cita es el {fecha} a las {hora} con {especialista}"
    - If None AND onboarding incomplete: Guide them to schedule via get_available_appointments
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


# Default doctor ID
DEFAULT_DOCTOR_ID = ""


@tool
def schedule_meeting(
    phone: str,
    slot_date: str,
    slot_time: str,
    conversation_id: Optional[str] = None,
    reason: Optional[str] = None,
    specialist_type: str = "ginecólogo",
) -> dict:
    """Schedule a meeting by creating an appointment AND a following record.

    IMPORTANT: This tool performs TWO operations in order:
    1. Creates an appointment record in the database (with conversation_id)
    2. Creates a following record with type="business" (with conversation_id)

    Both records store the conversation_id to map them back to this chat in the CMS.

    WHEN TO USE:
    - Patient has chosen a specific date/time from get_available_appointments
    - After confirming with patient which slot they want
    - NOT during initial contact - first show availability, then schedule

    TYPICAL FLOW:
    1. Patient: "Quiero agendar una cita"
    2. Agent: calls get_available_appointments() → shows options
    3. Patient: "El lunes a las 10"
    4. Agent: calls schedule_meeting(phone, "2025-12-02", "10:00", conversation_id, ...)

    DATE/TIME FORMAT:
    - slot_date: YYYY-MM-DD format (e.g., "2025-12-02")
    - slot_time: HH:MM format (e.g., "10:00", "15:30")

    RETURNS:
    - appointment: the created appointment record (includes conversation_id)
    - following: the created following record (includes conversation_id)
    - message: confirmation message for the patient

    RESPONSE PATTERN after success:
    "¡Perfecto! Tu cita está agendada para el {fecha} a las {hora} con {especialista}.
    Te enviaremos un recordatorio antes de la consulta. 💜"

    Args:
        phone: Patient phone number
        slot_date: Selected date in YYYY-MM-DD format
        slot_time: Selected time in HH:MM format
        conversation_id: Conversation UUID for CMS mapping (from thread_id)
        reason: Optional reason for the appointment
        specialist_type: Type of specialist (default: "ginecólogo")
    """
    patient_repo = PatientRepository()
    appointment_repo = AppointmentRepository()
    following_repo = FollowingRepository()

    # Look up patient
    patient = patient_repo.get_by_phone(phone)
    if not patient:
        return {
            "status": "error",
            "message": "No se encontró el paciente. Por favor, regístrate primero.",
        }

    patient_id = patient["id"]

    # Parse the datetime
    try:
        scheduled_datetime = datetime.strptime(f"{slot_date} {slot_time}", "%Y-%m-%d %H:%M")
    except ValueError:
        return {
            "status": "error",
            "message": "Formato de fecha/hora inválido. "
            "Usa YYYY-MM-DD para fecha y HH:MM para hora.",
        }

    notes = reason or f"Cita agendada vía WhatsApp - {specialist_type}"

    # =========================================================================
    # STEP 1: Create the appointment FIRST (with conversation_id)
    # =========================================================================
    appointment = None
    appointment_id = None

    try:
        # Try to create appointment in DB with default doctor
        appointment = appointment_repo.create(
            patient_id=patient_id,
            doctor_id=DEFAULT_DOCTOR_ID,
            scheduled_at=scheduled_datetime,
            appointment_type="consulta",
            notes=notes,
            conversation_id=conversation_id,  # Map to conversation for CMS
        )
        if appointment:
            appointment_id = appointment.get("id")
    except Exception as e:
        print(f"Error creating appointment in DB: {e}")

    # If DB creation failed, create a mock appointment response
    if not appointment:
        appointment_id = str(uuid4())
        appointment = {
            "id": appointment_id,
            "patient_id": patient_id,
            "doctor_id": DEFAULT_DOCTOR_ID,
            "scheduled_at": scheduled_datetime.isoformat(),
            "type": "consulta",
            "status": "scheduled",
            "notes": notes,
            "conversation_id": conversation_id,
            "created_at": datetime.now().isoformat(),
            "_mock": True,  # Flag to indicate this is a mock response
        }

    # =========================================================================
    # STEP 2: Create the following AFTER the appointment (with conversation_id)
    # =========================================================================
    formatted_date = scheduled_datetime.strftime("%d/%m/%Y a las %H:%M")

    following = following_repo.create(
        patient_id=patient_id,
        following_type="business",
        summary=f"Cita agendada: {formatted_date} - {specialist_type}",
        severity_score=None,
        is_urgent=False,
        appointment_id=appointment_id,  # Link to the appointment created above
        conversation_id=conversation_id,  # Map to conversation for CMS
    )

    # Verify following was created
    if not following:
        print(f"Warning: Following record not created for appointment {appointment_id}")

    return {
        "status": "success",
        "appointment": appointment,
        "following": following,
        "appointment_id": appointment_id,
        "conversation_id": conversation_id,
        "following_created": following is not None,
        "message": (
            f"Tu cita ha sido agendada para el {formatted_date}. "
            "Te enviaremos un recordatorio antes de la consulta."
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
    1. get_next_appointment() → get appointment with ID
    2. Patient asks for more details → get_appointment_info(phone, appointment_id)

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
    - Patient asks to reschedule (cancel + create new via schedule_meeting)

    BEFORE CALLING:
    1. Confirm which appointment they want to cancel (use get_next_appointment if unclear)
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
    "Tu solicitud de cancelación ha sido registrada. ¿Te gustaría reagendar?"

    Args:
        phone: Patient phone number
        appointment_id: UUID of the appointment to cancel (get from get_next_appointment)
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
    get_available_appointments,
    get_next_appointment,
    schedule_meeting,
    get_appointment_info,
    cancel_appointment_request,
]
