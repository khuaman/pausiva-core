"""
Supabase-based storage manager for Pausiva Agent.
Replaces JSON file storage with Supabase database.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import uuid4

from .client import SupabaseClient, get_supabase_client
from .repositories import (
    PatientRepository,
    FollowingRepository,
    AppointmentRepository,
    TimelineRepository,
    PlanRepository
)


class SupabaseStorageManager:
    """
    Storage manager that uses Supabase as backend.
    Provides the same interface as the JSON StorageManager
    but stores data in Supabase.
    """
    
    def __init__(self):
        self.client = get_supabase_client()
        self.patients = PatientRepository()
        self.followings = FollowingRepository()
        self.appointments = AppointmentRepository()
        self.timeline = TimelineRepository()
        self.plans = PlanRepository()
        
        # Cache for patient IDs (phone -> patient_id)
        self._patient_id_cache: Dict[str, str] = {}
    
    def is_available(self) -> bool:
        """Check if Supabase is available."""
        return SupabaseClient.is_available()
    
    # =========================================
    # Patient methods
    # =========================================
    
    def get_patient_id(self, phone_number: str) -> Optional[str]:
        """Get patient ID by phone number."""
        if phone_number in self._patient_id_cache:
            return self._patient_id_cache[phone_number]
        
        patient = self.patients.get_by_phone(phone_number)
        if patient:
            self._patient_id_cache[phone_number] = patient["id"]
            return patient["id"]
        return None
    
    def save_patient(self, phone_number: str, data: dict):
        """Save patient data."""
        result = self.patients.create_or_update(phone_number, data)
        if result:
            self._patient_id_cache[phone_number] = result["id"]
    
    def load_patient(self, phone_number: str) -> Optional[dict]:
        """Load patient data by phone number."""
        patient = self.patients.get_by_phone(phone_number)
        if patient:
            self._patient_id_cache[phone_number] = patient["id"]
            # Format to match expected structure
            return {
                "phone_number": patient["phone"],
                "name": patient["name"],
                "profile": patient.get("clinical_profile", {}),
                "created_at": patient.get("created_at"),
                "last_interaction": patient.get("updated_at"),
                "current_risk_level": patient.get("clinical_profile", {}).get("current_risk_level", "none"),
                "current_risk_score": patient.get("clinical_profile", {}).get("current_risk_score", 0)
            }
        return None
    
    def patient_exists(self, phone_number: str) -> bool:
        """Check if patient exists."""
        return self.get_patient_id(phone_number) is not None
    
    # =========================================
    # Conversation/Following methods
    # =========================================
    
    def save_conversation(self, phone_number: str, messages: list[dict]):
        """
        Save conversation - creates a following record.
        In Supabase, we store conversations as followings with message count.
        """
        patient_id = self.get_patient_id(phone_number)
        if not patient_id:
            return
        
        # Get the latest message to determine type and severity
        if messages:
            last_msg = messages[-1]
            metadata = last_msg.get("metadata", {})
            
            # Determine following type based on agent
            agent = metadata.get("agent", "other")
            type_map = {
                "triage": "symptoms",
                "medication": "medications",
                "checkin": "emotional",
                "appointments": "business"
            }
            following_type = type_map.get(agent, "other")
            
            # Get risk info
            risk_level = metadata.get("risk_level", "none")
            risk_score = self._risk_level_to_score(risk_level)
            is_urgent = risk_level == "high"
            
            # Create summary from last few messages
            summary = self._create_conversation_summary(messages[-5:])
            
            # Create following record
            self.followings.create(
                patient_id=patient_id,
                following_type=following_type,
                summary=summary,
                severity_score=risk_score,
                is_urgent=is_urgent,
                message_count=len(messages)
            )
            
            # Add to timeline
            self.timeline.add_event(
                patient_id=patient_id,
                event_type="followup",
                source_table="followings",
                source_id=str(uuid4()),  # We don't have the following ID here
                summary=summary,
                payload={"message_count": len(messages), "risk_level": risk_level}
            )
    
    def load_conversation(self, phone_number: str) -> list[dict]:
        """
        Load conversation history.
        Note: In Supabase model, we store summaries, not full transcripts.
        Returns empty list - full conversation is managed in memory.
        """
        # Conversations are kept in memory, Supabase stores summaries
        return []
    
    def _create_conversation_summary(self, messages: list[dict]) -> str:
        """Create a summary from recent messages."""
        summaries = []
        for msg in messages:
            role = "Paciente" if msg.get("message_type") == "user" else "Asistente"
            content = msg.get("content", "")[:100]
            summaries.append(f"{role}: {content}")
        return "\n".join(summaries[-3:])  # Last 3 exchanges
    
    def _risk_level_to_score(self, risk_level: str) -> int:
        """Convert risk level to numeric score."""
        scores = {"high": 9, "medium": 6, "low": 3, "none": 0}
        return scores.get(risk_level, 0)
    
    # =========================================
    # Medication methods
    # =========================================
    
    def save_medications(self, phone_number: str, medications: list[dict]):
        """
        Save medications - stored in clinical_profile_json.
        """
        patient_id = self.get_patient_id(phone_number)
        if not patient_id:
            return
        
        # Get current profile and update medications
        patient = self.patients.get_by_id(patient_id)
        if patient:
            profile = patient.get("clinical_profile", {}) or {}
            profile["medications"] = medications
            profile["medications_updated_at"] = datetime.now().isoformat()
            self.patients.update_clinical_profile(patient_id, profile)
    
    def load_medications(self, phone_number: str) -> list[dict]:
        """Load medications from clinical profile."""
        patient = self.patients.get_by_phone(phone_number)
        if patient:
            profile = patient.get("clinical_profile", {}) or {}
            return profile.get("medications", [])
        return []
    
    # =========================================
    # Appointment methods
    # =========================================
    
    def save_appointments(self, phone_number: str, appointments: list[dict]):
        """
        Save appointments.
        Note: Appointments in Supabase require a doctor_id.
        This stores appointment info in clinical profile for now.
        """
        patient_id = self.get_patient_id(phone_number)
        if not patient_id:
            return
        
        patient = self.patients.get_by_id(patient_id)
        if patient:
            profile = patient.get("clinical_profile", {}) or {}
            profile["pending_appointments"] = appointments
            profile["appointments_updated_at"] = datetime.now().isoformat()
            self.patients.update_clinical_profile(patient_id, profile)
    
    def load_appointments(self, phone_number: str) -> list[dict]:
        """Load appointments for a patient."""
        patient_id = self.get_patient_id(phone_number)
        if not patient_id:
            return []
        
        # Try to get from appointments table first
        db_appointments = self.appointments.get_upcoming(patient_id)
        if db_appointments:
            return db_appointments
        
        # Fallback to clinical profile
        patient = self.patients.get_by_phone(phone_number)
        if patient:
            profile = patient.get("clinical_profile", {}) or {}
            return profile.get("pending_appointments", [])
        return []
    
    # =========================================
    # Symptom methods
    # =========================================
    
    def save_symptom_entry(self, phone_number: str, entry: dict):
        """
        Save a symptom entry.
        Creates a following of type 'symptoms'.
        """
        patient_id = self.get_patient_id(phone_number)
        if not patient_id:
            return
        
        summary = entry.get("summary", "")
        risk_level = entry.get("risk_level", "none")
        risk_score = entry.get("risk_score", 0)
        
        # Create following for symptom tracking
        self.followings.create(
            patient_id=patient_id,
            following_type="symptoms",
            summary=summary,
            severity_score=min(risk_score // 10, 10),  # Convert 0-100 to 0-10
            is_urgent=risk_level == "high"
        )
        
        # Add to timeline
        self.timeline.add_event(
            patient_id=patient_id,
            event_type="followup",
            source_table="followings",
            source_id=str(uuid4()),
            summary=f"Síntomas: {summary}",
            payload={"risk_level": risk_level, "risk_score": risk_score}
        )
    
    def load_symptom_history(self, phone_number: str, limit: int = 30) -> list[dict]:
        """Load symptom history."""
        patient_id = self.get_patient_id(phone_number)
        if not patient_id:
            return []
        
        followings = self.followings.get_by_patient(
            patient_id,
            limit=limit,
            following_type="symptoms"
        )
        
        return [
            {
                "summary": f.get("summary", ""),
                "risk_level": self._score_to_risk_level(f.get("severity_score", 0)),
                "risk_score": (f.get("severity_score", 0) or 0) * 10,
                "timestamp": f.get("contacted_at")
            }
            for f in followings
        ]
    
    def _score_to_risk_level(self, score: int) -> str:
        """Convert 0-10 score to risk level."""
        if score is None:
            return "none"
        if score >= 8:
            return "high"
        elif score >= 5:
            return "medium"
        elif score >= 2:
            return "low"
        return "none"
    
    # =========================================
    # Risk tracking
    # =========================================
    
    def update_patient_risk(self, phone_number: str, risk_level: str, risk_score: int):
        """Update patient's current risk level."""
        patient_id = self.get_patient_id(phone_number)
        if not patient_id:
            return
        
        patient = self.patients.get_by_id(patient_id)
        if patient:
            profile = patient.get("clinical_profile", {}) or {}
            profile["current_risk_level"] = risk_level
            profile["current_risk_score"] = risk_score
            profile["risk_updated_at"] = datetime.now().isoformat()
            self.patients.update_clinical_profile(patient_id, profile)
    
    # =========================================
    # Extended data for agents
    # =========================================
    
    def get_patient_context_data(self, phone_number: str) -> dict:
        """
        Get comprehensive patient data for agent context.
        Includes data from multiple tables.
        """
        patient_id = self.get_patient_id(phone_number)
        if not patient_id:
            return {}
        
        patient = self.patients.get_by_id(patient_id)
        if not patient:
            return {}
        
        # Get related data
        appointments = self.appointments.get_upcoming(patient_id, limit=3)
        symptoms = self.load_symptom_history(phone_number, limit=5)
        medications = self.load_medications(phone_number)
        
        # Get recent followings for context
        recent_followings = self.followings.get_by_patient(patient_id, limit=5)
        
        return {
            "patient": {
                "id": patient_id,
                "name": patient.get("name"),
                "phone": patient.get("phone"),
                "birth_date": patient.get("birth_date"),
                "clinical_profile": patient.get("clinical_profile", {})
            },
            "upcoming_appointments": appointments,
            "recent_symptoms": symptoms,
            "active_medications": medications,
            "recent_interactions": [
                {
                    "type": f.get("type"),
                    "summary": f.get("summary"),
                    "date": f.get("contacted_at"),
                    "is_urgent": f.get("is_urgent")
                }
                for f in recent_followings
            ]
        }

