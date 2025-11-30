"""Medication models."""

from datetime import date, datetime
from typing import ClassVar, Optional

from pydantic import Field

from .base import TableModel


class Medication(TableModel):
    """Individual medication model."""

    __tablename__: ClassVar[str] = "medications"

    name: str
    raw_text: str = ""  # Original prescription text
    frequency_text: str = ""  # "2 veces al día", "cada 8 horas", etc.
    times_of_day: list[str] = Field(default_factory=list)  # ["08:00", "20:00"]
    duration_days: Optional[int] = None
    start_date: date = Field(default_factory=date.today)
    notes: str = ""
    is_active: bool = True


class MedicationSchedule(TableModel):
    """Complete medication schedule for a patient."""

    __tablename__: ClassVar[str] = "medication_schedules"

    phone_number: str
    medications: list[Medication] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    def get_active_medications(self) -> list[Medication]:
        """Return only active medications."""
        return [m for m in self.medications if m.is_active]

    def add_medication(self, medication: Medication) -> None:
        """Add a medication to the schedule."""
        self.medications.append(medication)
        self.updated_at = datetime.now()
