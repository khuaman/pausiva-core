from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from enum import Enum


class RiskLevel(str, Enum):
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass
class PatientProfile:
    """Perfil médico y personal de la paciente."""
    age: Optional[int] = None
    medical_conditions: list[str] = field(default_factory=list)
    allergies: list[str] = field(default_factory=list)
    current_medications: list[str] = field(default_factory=list)
    notes: str = ""
    
    def to_dict(self) -> dict:
        return {
            "age": self.age,
            "medical_conditions": self.medical_conditions,
            "allergies": self.allergies,
            "current_medications": self.current_medications,
            "notes": self.notes
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "PatientProfile":
        return cls(
            age=data.get("age"),
            medical_conditions=data.get("medical_conditions", []),
            allergies=data.get("allergies", []),
            current_medications=data.get("current_medications", []),
            notes=data.get("notes", "")
        )


@dataclass
class Patient:
    """Modelo de paciente identificada por número de teléfono."""
    phone_number: str
    name: Optional[str] = None
    profile: PatientProfile = field(default_factory=PatientProfile)
    created_at: datetime = field(default_factory=datetime.now)
    last_interaction: datetime = field(default_factory=datetime.now)
    current_risk_level: RiskLevel = RiskLevel.NONE
    current_risk_score: int = 0
    
    def to_dict(self) -> dict:
        return {
            "phone_number": self.phone_number,
            "name": self.name,
            "profile": self.profile.to_dict(),
            "created_at": self.created_at.isoformat(),
            "last_interaction": self.last_interaction.isoformat(),
            "current_risk_level": self.current_risk_level.value,
            "current_risk_score": self.current_risk_score
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "Patient":
        return cls(
            phone_number=data["phone_number"],
            name=data.get("name"),
            profile=PatientProfile.from_dict(data.get("profile", {})),
            created_at=datetime.fromisoformat(data["created_at"]) if data.get("created_at") else datetime.now(),
            last_interaction=datetime.fromisoformat(data["last_interaction"]) if data.get("last_interaction") else datetime.now(),
            current_risk_level=RiskLevel(data.get("current_risk_level", "none")),
            current_risk_score=data.get("current_risk_score", 0)
        )

