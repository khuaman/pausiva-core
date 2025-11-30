"""Domain models for Pausiva AI Multiagent."""

from .appointment import Appointment, AppointmentAction, AppointmentStatus
from .base import AI_SCHEMA, TableModel
from .medication import Medication, MedicationSchedule
from .message import Message, MessageType
from .patient import Patient, PatientProfile, RiskLevel
from .response import AgentResponse

__all__ = [
    # Base
    "TableModel",
    "AI_SCHEMA",
    # Patient
    "Patient",
    "PatientProfile",
    "RiskLevel",
    # Message
    "Message",
    "MessageType",
    # Medication
    "Medication",
    "MedicationSchedule",
    # Appointment
    "Appointment",
    "AppointmentAction",
    "AppointmentStatus",
    # Response
    "AgentResponse",
]
