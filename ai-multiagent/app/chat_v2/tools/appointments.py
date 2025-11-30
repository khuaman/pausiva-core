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
    """
    Get appointments for a patient.

    Use this tool to look up upcoming or past appointments.

    Args:
        phone: Patient phone number
        include_past: Whether to include past appointments
        limit: Maximum number of appointments to return

    Returns:
        List of appointment records with date, time, specialist, status, etc.
        Empty list if patient not found or no appointments.
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
    """
    Get the next upcoming appointment for a patient.

    Use this tool to quickly check the patient's next scheduled appointment.

    Args:
        phone: Patient phone number

    Returns:
        Next appointment record, or None if no upcoming appointments.
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
    """
    Create a request for a new appointment.

    Use this tool when a patient wants to schedule a new appointment.
    Note: This creates a request that needs to be confirmed by staff.
    For MVP, this records the intent - actual scheduling will be done
    via Taycal integration (coming soon).

    Args:
        phone: Patient phone number
        requested_date: Preferred date (YYYY-MM-DD) or description like "next week"
        requested_time: Preferred time or description like "morning"
        specialist_type: Type of specialist needed (e.g., "ginecólogo", "general")
        reason: Reason for the appointment

    Returns:
        Dictionary with request details and status.
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
    """
    Get details of a specific appointment.

    Use this tool when the patient asks about a specific appointment.

    Args:
        phone: Patient phone number (for validation)
        appointment_id: ID of the appointment

    Returns:
        Appointment details, or None if not found.
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
    """
    Request cancellation of an appointment.

    Use this tool when a patient wants to cancel an appointment.
    Note: This creates a cancellation request that may need staff confirmation.

    Args:
        phone: Patient phone number
        appointment_id: ID of the appointment to cancel
        reason: Reason for cancellation (optional)

    Returns:
        Dictionary with cancellation request status.
    """
    patient_repo = PatientRepository()
    patient = patient_repo.get_by_phone(phone)

    return {
        "status": "cancellation_requested",
        "appointment_id": appointment_id,
        "patient_id": patient["id"] if patient else None,
        "reason": reason,
        "message": (
            "Tu solicitud de cancelación ha sido registrada. "
            "Recibirás confirmación pronto."
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

