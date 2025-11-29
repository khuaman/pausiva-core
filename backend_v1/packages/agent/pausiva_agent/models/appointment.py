from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


class AppointmentAction(str, Enum):
    REMIND = "REMIND"
    CONFIRM = "CONFIRM"
    CANCEL_REQUEST = "CANCEL_REQUEST"
    RESCHEDULE_REQUEST = "RESCHEDULE_REQUEST"


class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    RESCHEDULED = "rescheduled"


@dataclass
class Appointment:
    """Modelo de cita médica."""
    appointment_id: str
    phone_number: str
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    specialist_type: str
    status: AppointmentStatus = AppointmentStatus.SCHEDULED
    notes: str = ""
    google_calendar_id: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> dict:
        return {
            "appointment_id": self.appointment_id,
            "phone_number": self.phone_number,
            "date": self.date,
            "time": self.time,
            "specialist_type": self.specialist_type,
            "status": self.status.value,
            "notes": self.notes,
            "google_calendar_id": self.google_calendar_id,
            "created_at": self.created_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "Appointment":
        return cls(
            appointment_id=data["appointment_id"],
            phone_number=data["phone_number"],
            date=data["date"],
            time=data["time"],
            specialist_type=data["specialist_type"],
            status=AppointmentStatus(data.get("status", "scheduled")),
            notes=data.get("notes", ""),
            google_calendar_id=data.get("google_calendar_id"),
            created_at=datetime.fromisoformat(data["created_at"]) if data.get("created_at") else datetime.now()
        )
    
    def get_datetime(self) -> Optional[datetime]:
        """
        Retorna la fecha y hora de la cita como datetime.
        Maneja diferentes formatos de fecha.
        """
        try:
            # Formato ISO estándar
            return datetime.strptime(f"{self.date} {self.time}", "%Y-%m-%d %H:%M")
        except ValueError:
            try:
                # Intentar solo con hora si la fecha no es válida
                # Esto puede pasar cuando el modelo devuelve "viernes" en lugar de fecha ISO
                return None
            except Exception:
                return None
    
    def is_upcoming(self) -> bool:
        """Verifica si la cita es futura."""
        dt = self.get_datetime()
        if dt is None:
            # Si no podemos parsear la fecha, asumimos que es futura
            return self.status in [
                AppointmentStatus.SCHEDULED,
                AppointmentStatus.CONFIRMED
            ]
        return dt > datetime.now() and self.status in [
            AppointmentStatus.SCHEDULED,
            AppointmentStatus.CONFIRMED
        ]

