from dataclasses import dataclass, field
from datetime import datetime, date
from typing import Optional


@dataclass
class Medication:
    """Modelo de medicamento individual."""
    name: str
    raw_text: str  # Texto original de la receta
    frequency_text: str  # "2 veces al día", "cada 8 horas", etc.
    times_of_day: list[str] = field(default_factory=list)  # ["08:00", "20:00"]
    duration_days: Optional[int] = None
    start_date: date = field(default_factory=date.today)
    notes: str = ""
    is_active: bool = True
    
    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "raw_text": self.raw_text,
            "frequency_text": self.frequency_text,
            "times_of_day": self.times_of_day,
            "duration_days": self.duration_days,
            "start_date": self.start_date.isoformat(),
            "notes": self.notes,
            "is_active": self.is_active
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "Medication":
        return cls(
            name=data["name"],
            raw_text=data.get("raw_text", ""),
            frequency_text=data.get("frequency_text", ""),
            times_of_day=data.get("times_of_day", []),
            duration_days=data.get("duration_days"),
            start_date=date.fromisoformat(data["start_date"]) if data.get("start_date") else date.today(),
            notes=data.get("notes", ""),
            is_active=data.get("is_active", True)
        )


@dataclass
class MedicationSchedule:
    """Programa completo de medicación de una paciente."""
    phone_number: str
    medications: list[Medication] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> dict:
        return {
            "phone_number": self.phone_number,
            "medications": [m.to_dict() for m in self.medications],
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "MedicationSchedule":
        return cls(
            phone_number=data["phone_number"],
            medications=[Medication.from_dict(m) for m in data.get("medications", [])],
            created_at=datetime.fromisoformat(data["created_at"]) if data.get("created_at") else datetime.now(),
            updated_at=datetime.fromisoformat(data["updated_at"]) if data.get("updated_at") else datetime.now()
        )
    
    def get_active_medications(self) -> list[Medication]:
        """Retorna solo los medicamentos activos."""
        return [m for m in self.medications if m.is_active]
    
    def add_medication(self, medication: Medication):
        """Agrega un medicamento al programa."""
        self.medications.append(medication)
        self.updated_at = datetime.now()

