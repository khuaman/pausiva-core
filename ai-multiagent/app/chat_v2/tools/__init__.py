"""Tools for Chat V2 agent."""

from .appointments import (
    APPOINTMENT_TOOLS,
    cancel_appointment_request,
    get_appointment_info,
    get_available_appointments,
    get_next_appointment,
    schedule_meeting,
)
from .followings import (
    FOLLOWING_TOOLS,
    create_following,
    get_followings,
    get_urgent_followings,
)
from .patient import (
    PATIENT_TOOLS,
    get_patient_by_phone,
    update_onboarding_state,
    update_patient_info,
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
]

__all__ = [
    # Patient
    "get_patient_by_phone",
    "update_patient_info",
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
    "get_available_appointments",
    "get_next_appointment",
    "schedule_meeting",
    "get_appointment_info",
    "cancel_appointment_request",
    "APPOINTMENT_TOOLS",
    # Combined
    "ALL_TOOLS",
]

