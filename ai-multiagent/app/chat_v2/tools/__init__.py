"""Tools for Chat V2 agent."""

from .appointments import (
    APPOINTMENT_TOOLS,
    cancel_appointment_request,
    create_appointment_request,
    get_appointment_info,
    get_appointments,
    get_next_appointment,
)
from .followings import (
    FOLLOWING_TOOLS,
    create_following,
    get_followings,
    get_urgent_followings,
)
from .medication import (
    MEDICATION_TOOLS,
    add_medication_info,
    confirm_medication_taken,
    get_medications,
    set_medication_reminder,
)
from .patient import (
    PATIENT_TOOLS,
    create_patient,
    get_patient_by_phone,
    update_onboarding_state,
    update_patient,
)
from .triage import (
    TRIAGE_TOOLS,
    assess_symptoms,
    get_symptom_history,
    record_symptom_report,
)

# All tools combined
ALL_TOOLS = [
    # Patient tools
    *PATIENT_TOOLS,
    # Following tools
    *FOLLOWING_TOOLS,
    # Triage tools
    *TRIAGE_TOOLS,
    # Appointment tools
    *APPOINTMENT_TOOLS,
    # Medication tools
    *MEDICATION_TOOLS,
]

__all__ = [
    # Patient
    "get_patient_by_phone",
    "create_patient",
    "update_patient",
    "update_onboarding_state",
    "PATIENT_TOOLS",
    # Followings
    "create_following",
    "get_followings",
    "get_urgent_followings",
    "FOLLOWING_TOOLS",
    # Triage
    "assess_symptoms",
    "record_symptom_report",
    "get_symptom_history",
    "TRIAGE_TOOLS",
    # Appointments
    "get_appointments",
    "get_next_appointment",
    "create_appointment_request",
    "get_appointment_info",
    "cancel_appointment_request",
    "APPOINTMENT_TOOLS",
    # Medication
    "get_medications",
    "add_medication_info",
    "set_medication_reminder",
    "confirm_medication_taken",
    "MEDICATION_TOOLS",
    # Combined
    "ALL_TOOLS",
]

