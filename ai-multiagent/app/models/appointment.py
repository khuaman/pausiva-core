"""Appointment models."""
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class AppointmentAction(str, Enum):
    """Actions that can be taken on appointments."""

    REMIND = "REMIND"
    CONFIRM = "CONFIRM"
    CANCEL_REQUEST = "CANCEL_REQUEST"
    RESCHEDULE_REQUEST = "RESCHEDULE_REQUEST"


class AppointmentStatus(str, Enum):
    """Status of an appointment."""

    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    RESCHEDULED = "rescheduled"


class Appointment(BaseModel):
    """Medical appointment model."""

    appointment_id: str
    phone_number: str
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    specialist_type: str
    status: AppointmentStatus = AppointmentStatus.SCHEDULED
    notes: str = ""
    google_calendar_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)

    def get_datetime(self) -> Optional[datetime]:
        """Return the appointment date and time as datetime."""
        try:
            return datetime.strptime(f"{self.date} {self.time}", "%Y-%m-%d %H:%M")
        except ValueError:
            return None

    def is_upcoming(self) -> bool:
        """Check if the appointment is in the future."""
        dt = self.get_datetime()
        if dt is None:
            # If we can't parse the date, assume it's upcoming if status is valid
            return self.status in [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED]
        return dt > datetime.now() and self.status in [
            AppointmentStatus.SCHEDULED,
            AppointmentStatus.CONFIRMED,
        ]

