"""Type definitions and enums for the chat domain."""
from enum import Enum


class MessageCategory(str, Enum):
    """Categories of messages for routing."""

    TRIAGE = "triage"
    MEDICATION = "medication"
    APPOINTMENTS = "appointments"
    CHECKIN = "checkin"
    GENERAL = "general"
    GREETING = "greeting"
    CONTINUATION = "continuation"


class ConversationTopic(str, Enum):
    """Active conversation topics."""

    NONE = "none"
    GREETING = "greeting"
    SYMPTOMS = "symptoms"
    MEDICATION = "medication"
    APPOINTMENTS = "appointments"
    CHECKIN = "checkin"
    EMERGENCY = "emergency"
    GENERAL = "general"

