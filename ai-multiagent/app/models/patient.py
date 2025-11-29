"""Patient models."""
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class RiskLevel(str, Enum):
    """Risk level classification."""

    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class PatientProfile(BaseModel):
    """Medical and personal profile of a patient."""

    age: Optional[int] = None
    medical_conditions: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)
    current_medications: list[str] = Field(default_factory=list)
    notes: str = ""


class Patient(BaseModel):
    """Patient model identified by phone number."""

    phone_number: str
    name: Optional[str] = None
    profile: PatientProfile = Field(default_factory=PatientProfile)
    created_at: datetime = Field(default_factory=datetime.now)
    last_interaction: datetime = Field(default_factory=datetime.now)
    current_risk_level: RiskLevel = RiskLevel.NONE
    current_risk_score: int = 0

    def get_profile_summary(self) -> str:
        """Generate a summary of the patient profile."""
        parts = []
        if self.profile.age:
            parts.append(f"Edad: {self.profile.age}")
        if self.profile.medical_conditions:
            parts.append(f"Condiciones: {', '.join(self.profile.medical_conditions)}")
        if self.profile.allergies:
            parts.append(f"Alergias: {', '.join(self.profile.allergies)}")
        return "; ".join(parts) if parts else "Sin información de perfil"

