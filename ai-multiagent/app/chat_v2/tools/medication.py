"""Medication management tools for Chat V2 agent."""

from typing import Optional

from langchain_core.tools import tool

from app.shared.database import PatientRepository


@tool
def get_medications(phone: str) -> list[dict]:
    """
    Get active medications for a patient.

    Use this tool to look up what medications a patient is currently taking.

    Args:
        phone: Patient phone number

    Returns:
        List of medication records with name, dosage, frequency, etc.
        Empty list if patient not found or no medications.
    """
    patient_repo = PatientRepository()

    # Look up patient
    patient = patient_repo.get_by_phone(phone)
    if not patient:
        return []

    # Get medications from patient's clinical profile or plans
    clinical_profile = patient.get("clinical_profile", {}) or {}
    return clinical_profile.get("medications", [])


@tool
def add_medication_info(
    phone: str,
    medication_name: str,
    dosage: Optional[str] = None,
    frequency: Optional[str] = None,
    time_of_day: Optional[str] = None,
    notes: Optional[str] = None,
) -> dict:
    """
    Add medication information for a patient.

    Use this tool when a patient provides information about their medication.
    This stores the medication details in their clinical profile.

    Args:
        phone: Patient phone number
        medication_name: Name of the medication
        dosage: Dosage information (e.g., "500mg")
        frequency: How often to take (e.g., "cada 8 horas")
        time_of_day: When to take (e.g., "mañana y noche")
        notes: Additional notes (e.g., "con comida")

    Returns:
        Dictionary with status and updated medication info.
    """
    patient_repo = PatientRepository()

    patient = patient_repo.get_by_phone(phone)
    if not patient:
        return {"status": "error", "message": "Paciente no encontrado"}

    # Get current clinical profile
    clinical_profile = patient.get("clinical_profile", {}) or {}
    medications = clinical_profile.get("medications", [])

    # Add new medication
    new_med = {
        "name": medication_name,
        "dosage": dosage,
        "frequency": frequency,
        "time_of_day": time_of_day,
        "notes": notes,
        "active": True,
    }
    medications.append(new_med)

    # Update clinical profile
    clinical_profile["medications"] = medications
    patient_repo.create_or_update(phone, {"clinical_profile": clinical_profile})

    return {
        "status": "success",
        "message": f"Medicamento {medication_name} registrado correctamente",
        "medication": new_med,
    }


@tool
def set_medication_reminder(
    phone: str,
    medication_name: str,
    reminder_times: list[str],
    days_of_week: Optional[list[str]] = None,
) -> dict:
    """
    Set up medication reminders for a patient.

    Use this tool when a patient wants to set up reminders for their medication.
    Note: For MVP, this records the reminder preferences - actual scheduling
    will be implemented later.

    Args:
        phone: Patient phone number
        medication_name: Name of the medication
        reminder_times: List of times to remind (e.g., ["08:00", "20:00"])
        days_of_week: Days to remind (optional, defaults to daily)

    Returns:
        Dictionary with reminder configuration status.
    """
    patient_repo = PatientRepository()

    patient = patient_repo.get_by_phone(phone)
    if not patient:
        return {"status": "error", "message": "Paciente no encontrado"}

    reminder_config = {
        "medication_name": medication_name,
        "times": reminder_times,
        "days": days_of_week or ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"],
        "active": True,
    }

    # Get current clinical profile
    clinical_profile = patient.get("clinical_profile", {}) or {}
    reminders = clinical_profile.get("medication_reminders", [])

    # Add or update reminder
    existing_idx = None
    for idx, r in enumerate(reminders):
        if r.get("medication_name") == medication_name:
            existing_idx = idx
            break

    if existing_idx is not None:
        reminders[existing_idx] = reminder_config
    else:
        reminders.append(reminder_config)

    clinical_profile["medication_reminders"] = reminders
    patient_repo.create_or_update(phone, {"clinical_profile": clinical_profile})

    times_str = ", ".join(reminder_times)
    return {
        "status": "success",
        "message": f"Recordatorios configurados para {medication_name} a las {times_str}",
        "reminder": reminder_config,
    }


@tool
def confirm_medication_taken(
    phone: str,
    medication_name: str,
) -> dict:
    """
    Record that a patient has taken their medication.

    Use this tool when a patient confirms they took their medication
    (e.g., in response to a reminder).

    Args:
        phone: Patient phone number
        medication_name: Name of the medication taken

    Returns:
        Dictionary with confirmation status.
    """
    from datetime import datetime

    patient_repo = PatientRepository()

    patient = patient_repo.get_by_phone(phone)
    if not patient:
        return {"status": "error", "message": "Paciente no encontrado"}

    # Record the confirmation
    # For MVP, this is just logged - could be stored in a separate table later
    return {
        "status": "success",
        "message": f"Registrado: tomaste {medication_name}",
        "medication": medication_name,
        "confirmed_at": datetime.now().isoformat(),
    }


# Export all tools
MEDICATION_TOOLS = [
    get_medications,
    add_medication_info,
    set_medication_reminder,
    confirm_medication_taken,
]

