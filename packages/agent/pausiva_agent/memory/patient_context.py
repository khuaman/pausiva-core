from datetime import datetime
from typing import Optional

from ..models.patient import Patient, PatientProfile, RiskLevel
from ..models.medication import MedicationSchedule, Medication
from ..models.appointment import Appointment
from .storage import StorageManager
from .conversation import ConversationMemory


class PatientContext:
    """
    Contexto completo de una paciente.
    Centraliza toda la información necesaria para los agentes.
    """
    
    def __init__(self, phone_number: str, storage: StorageManager = None):
        self.phone_number = phone_number
        self.storage = storage or StorageManager()
        
        # Cargar o crear paciente
        self.patient = self._load_or_create_patient()
        
        # Inicializar memoria de conversación
        self.conversation = ConversationMemory(phone_number, self.storage)
        
        # Cargar datos adicionales
        self.medications = self._load_medications()
        self.appointments = self._load_appointments()
        self.symptom_history = self._load_symptoms()
    
    def _load_or_create_patient(self) -> Patient:
        """Carga la paciente existente o crea una nueva."""
        data = self.storage.load_patient(self.phone_number)
        if data:
            return Patient.from_dict(data)
        
        # Crear nueva paciente
        patient = Patient(phone_number=self.phone_number)
        self.storage.save_patient(self.phone_number, patient.to_dict())
        return patient
    
    def _load_medications(self) -> list[Medication]:
        """Carga la medicación de la paciente."""
        data = self.storage.load_medications(self.phone_number)
        return [Medication.from_dict(m) for m in data]
    
    def _load_appointments(self) -> list[Appointment]:
        """Carga las citas de la paciente."""
        data = self.storage.load_appointments(self.phone_number)
        return [Appointment.from_dict(a) for a in data]
    
    def _load_symptoms(self) -> list[dict]:
        """Carga el historial de síntomas."""
        return self.storage.load_symptom_history(self.phone_number)
    
    def save(self):
        """Guarda todos los datos de la paciente."""
        self.patient.last_interaction = datetime.now()
        self.storage.save_patient(self.phone_number, self.patient.to_dict())
        self.storage.save_medications(
            self.phone_number,
            [m.to_dict() for m in self.medications]
        )
        self.storage.save_appointments(
            self.phone_number,
            [a.to_dict() for a in self.appointments]
        )
    
    def update_risk(self, level: RiskLevel, score: int):
        """Actualiza el nivel de riesgo de la paciente."""
        self.patient.current_risk_level = level
        self.patient.current_risk_score = score
        self.save()
    
    def add_medication(self, medication: Medication):
        """Agrega un medicamento."""
        self.medications.append(medication)
        self.save()
    
    def add_appointment(self, appointment: Appointment):
        """Agrega una cita."""
        self.appointments.append(appointment)
        self.save()
    
    def add_symptom_entry(self, summary: str, risk_level: str, risk_score: int):
        """Registra una entrada de síntomas."""
        entry = {
            "summary": summary,
            "risk_level": risk_level,
            "risk_score": risk_score
        }
        self.storage.save_symptom_entry(self.phone_number, entry)
        self.symptom_history = self._load_symptoms()
    
    def get_active_medications(self) -> list[Medication]:
        """Retorna medicamentos activos."""
        return [m for m in self.medications if m.is_active]
    
    def get_upcoming_appointments(self) -> list[Appointment]:
        """Retorna citas futuras."""
        return [a for a in self.appointments if a.is_upcoming()]
    
    def get_context_summary(self) -> dict:
        """
        Genera un resumen del contexto para los agentes.
        Este resumen se incluye en cada llamada al modelo.
        """
        return {
            "patient": {
                "name": self.patient.name,
                "phone": self.phone_number,
                "profile": self.patient.profile.to_dict(),
                "current_risk_level": self.patient.current_risk_level.value,
                "current_risk_score": self.patient.current_risk_score
            },
            "active_medications": [m.to_dict() for m in self.get_active_medications()],
            "upcoming_appointments": [a.to_dict() for a in self.get_upcoming_appointments()],
            "recent_symptoms": self.symptom_history[-5:] if self.symptom_history else [],
            "conversation_summary": self.conversation.get_summary()
        }
    
    def is_new_patient(self) -> bool:
        """Verifica si es una paciente nueva (sin historial)."""
        return len(self.conversation.messages) == 0
