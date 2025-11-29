"""
Repository classes for database operations.
Maps Pausiva models to Supabase schema.
"""
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from uuid import uuid4

from .client import get_supabase_client


class PatientRepository:
    """
    Repository for patient data.
    Maps to: users + patients tables in Supabase.
    """
    
    def __init__(self):
        self.client = get_supabase_client()
    
    def get_by_phone(self, phone: str) -> Optional[Dict]:
        """
        Get patient by phone number.
        Returns combined user + patient data.
        """
        if not self.client:
            return None
        
        try:
            # Query users by phone
            result = self.client.table("users").select(
                "*, patients(*)"
            ).eq("phone", phone).single().execute()
            
            if result.data:
                return self._format_patient(result.data)
            return None
        except Exception:
            return None
    
    def get_by_id(self, patient_id: str) -> Optional[Dict]:
        """Get patient by ID."""
        if not self.client:
            return None
        
        try:
            result = self.client.table("patients").select(
                "*, users(*)"
            ).eq("id", patient_id).single().execute()
            
            if result.data:
                return self._format_patient_reverse(result.data)
            return None
        except Exception:
            return None
    
    def create_or_update(self, phone: str, data: Dict) -> Optional[Dict]:
        """
        Create or update a patient by phone number.
        """
        if not self.client:
            return None
        
        try:
            # Check if user exists
            existing = self.get_by_phone(phone)
            
            if existing:
                # Update existing
                return self._update_patient(existing["id"], data)
            else:
                # Create new user + patient
                return self._create_patient(phone, data)
        except Exception as e:
            print(f"Error creating/updating patient: {e}")
            return None
    
    def _create_patient(self, phone: str, data: Dict) -> Optional[Dict]:
        """Create new user and patient records."""
        user_id = str(uuid4())
        
        # Create user first
        user_data = {
            "id": user_id,
            "phone": phone,
            "full_name": data.get("name", ""),
            "email": data.get("email", f"{phone.replace('+', '')}@pausiva.temp"),
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        if data.get("birth_date"):
            user_data["birth_date"] = data["birth_date"]
        
        self.client.table("users").insert(user_data).execute()
        
        # Create patient record
        patient_data = {
            "id": user_id,
            "dni": data.get("dni", f"TEMP-{phone.replace('+', '')}"),
            "clinical_profile_json": data.get("clinical_profile", {})
        }
        
        self.client.table("patients").insert(patient_data).execute()
        
        return self.get_by_phone(phone)
    
    def _update_patient(self, patient_id: str, data: Dict) -> Optional[Dict]:
        """Update existing patient."""
        # Update user
        user_updates = {"updated_at": datetime.now().isoformat()}
        if data.get("name"):
            user_updates["full_name"] = data["name"]
        if data.get("birth_date"):
            user_updates["birth_date"] = data["birth_date"]
        
        self.client.table("users").update(user_updates).eq("id", patient_id).execute()
        
        # Update patient clinical profile if provided
        if data.get("clinical_profile"):
            self.client.table("patients").update({
                "clinical_profile_json": data["clinical_profile"]
            }).eq("id", patient_id).execute()
        
        return self.get_by_id(patient_id)
    
    def update_clinical_profile(self, patient_id: str, profile: Dict):
        """Update patient's clinical profile JSON."""
        if not self.client:
            return
        
        try:
            self.client.table("patients").update({
                "clinical_profile_json": profile
            }).eq("id", patient_id).execute()
        except Exception as e:
            print(f"Error updating clinical profile: {e}")
    
    def _format_patient(self, data: Dict) -> Dict:
        """Format user+patient data for the agent."""
        patient_data = data.get("patients", {}) or {}
        return {
            "id": data["id"],
            "phone": data.get("phone"),
            "name": data.get("full_name"),
            "email": data.get("email"),
            "birth_date": data.get("birth_date"),
            "dni": patient_data.get("dni") if isinstance(patient_data, dict) else None,
            "clinical_profile": patient_data.get("clinical_profile_json", {}) if isinstance(patient_data, dict) else {},
            "created_at": data.get("created_at"),
            "updated_at": data.get("updated_at")
        }
    
    def _format_patient_reverse(self, data: Dict) -> Dict:
        """Format patient+user data for the agent."""
        user_data = data.get("users", {}) or {}
        return {
            "id": data["id"],
            "phone": user_data.get("phone"),
            "name": user_data.get("full_name"),
            "email": user_data.get("email"),
            "birth_date": user_data.get("birth_date"),
            "dni": data.get("dni"),
            "clinical_profile": data.get("clinical_profile_json", {}),
            "created_at": user_data.get("created_at"),
            "updated_at": user_data.get("updated_at")
        }


class FollowingRepository:
    """
    Repository for follow-up interactions (WhatsApp conversations).
    Maps to: followings table in Supabase.
    
    This is where agent conversations are stored.
    """
    
    def __init__(self):
        self.client = get_supabase_client()
    
    def create(
        self,
        patient_id: str,
        following_type: str,
        summary: str = None,
        severity_score: int = None,
        is_urgent: bool = False,
        message_count: int = 1,
        appointment_id: str = None,
        transcript_url: str = None
    ) -> Optional[Dict]:
        """
        Create a new following record.
        
        following_type: 'emotional', 'symptoms', 'medications', 'business', 'other'
        """
        if not self.client:
            return None
        
        try:
            data = {
                "id": str(uuid4()),
                "patient_id": patient_id,
                "type": following_type,
                "channel": "whatsapp",
                "contacted_at": datetime.now().isoformat(),
                "message_count": message_count,
                "summary": summary,
                "severity_score": severity_score,
                "is_urgent": is_urgent,
                "created_at": datetime.now().isoformat()
            }
            
            if appointment_id:
                data["appointment_id"] = appointment_id
            if transcript_url:
                data["transcript_url"] = transcript_url
            
            result = self.client.table("followings").insert(data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error creating following: {e}")
            return None
    
    def get_by_patient(
        self,
        patient_id: str,
        limit: int = 10,
        following_type: str = None
    ) -> List[Dict]:
        """Get recent followings for a patient."""
        if not self.client:
            return []
        
        try:
            query = self.client.table("followings").select("*").eq(
                "patient_id", patient_id
            ).order("contacted_at", desc=True).limit(limit)
            
            if following_type:
                query = query.eq("type", following_type)
            
            result = query.execute()
            return result.data or []
        except Exception:
            return []
    
    def get_urgent_by_patient(self, patient_id: str) -> List[Dict]:
        """Get urgent followings for a patient."""
        if not self.client:
            return []
        
        try:
            result = self.client.table("followings").select("*").eq(
                "patient_id", patient_id
            ).eq("is_urgent", True).order("contacted_at", desc=True).execute()
            return result.data or []
        except Exception:
            return []
    
    def update_message_count(self, following_id: str, count: int):
        """Update message count for a following."""
        if not self.client:
            return
        
        try:
            self.client.table("followings").update({
                "message_count": count
            }).eq("id", following_id).execute()
        except Exception:
            pass


class AppointmentRepository:
    """
    Repository for appointments.
    Maps to: appointments table in Supabase.
    """
    
    def __init__(self):
        self.client = get_supabase_client()
    
    def get_by_patient(
        self,
        patient_id: str,
        status: str = None,
        upcoming_only: bool = False
    ) -> List[Dict]:
        """Get appointments for a patient."""
        if not self.client:
            return []
        
        try:
            query = self.client.table("appointments").select(
                "*, doctors(users(full_name))"
            ).eq("patient_id", patient_id).order("scheduled_at", desc=False)
            
            if status:
                query = query.eq("status", status)
            
            if upcoming_only:
                query = query.gte("scheduled_at", datetime.now().isoformat())
            
            result = query.execute()
            return [self._format_appointment(a) for a in (result.data or [])]
        except Exception:
            return []
    
    def get_upcoming(self, patient_id: str, limit: int = 5) -> List[Dict]:
        """Get upcoming appointments."""
        return self.get_by_patient(
            patient_id,
            status="scheduled",
            upcoming_only=True
        )[:limit]
    
    def create(
        self,
        patient_id: str,
        doctor_id: str,
        scheduled_at: datetime,
        appointment_type: str = "consulta",
        notes: str = None
    ) -> Optional[Dict]:
        """Create a new appointment."""
        if not self.client:
            return None
        
        try:
            data = {
                "id": str(uuid4()),
                "patient_id": patient_id,
                "doctor_id": doctor_id,
                "type": appointment_type,
                "status": "scheduled",
                "scheduled_at": scheduled_at.isoformat(),
                "notes": notes,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            result = self.client.table("appointments").insert(data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error creating appointment: {e}")
            return None
    
    def update_status(self, appointment_id: str, status: str, notes: str = None):
        """Update appointment status."""
        if not self.client:
            return
        
        try:
            updates = {
                "status": status,
                "updated_at": datetime.now().isoformat()
            }
            if notes:
                updates["notes"] = notes
            
            self.client.table("appointments").update(updates).eq(
                "id", appointment_id
            ).execute()
        except Exception:
            pass
    
    def _format_appointment(self, data: Dict) -> Dict:
        """Format appointment for the agent."""
        doctor_info = data.get("doctors", {})
        doctor_user = doctor_info.get("users", {}) if doctor_info else {}
        
        scheduled = data.get("scheduled_at", "")
        scheduled_dt = None
        if scheduled:
            try:
                scheduled_dt = datetime.fromisoformat(scheduled.replace("Z", "+00:00"))
            except:
                pass
        
        return {
            "id": data["id"],
            "patient_id": data.get("patient_id"),
            "doctor_id": data.get("doctor_id"),
            "doctor_name": doctor_user.get("full_name") if doctor_user else None,
            "type": data.get("type"),
            "status": data.get("status"),
            "scheduled_at": scheduled,
            "date": scheduled_dt.strftime("%Y-%m-%d") if scheduled_dt else None,
            "time": scheduled_dt.strftime("%H:%M") if scheduled_dt else None,
            "notes": data.get("notes"),
            "created_at": data.get("created_at")
        }


class TimelineRepository:
    """
    Repository for patient timeline events.
    Maps to: patient_timeline_events table in Supabase.
    """
    
    def __init__(self):
        self.client = get_supabase_client()
    
    def add_event(
        self,
        patient_id: str,
        event_type: str,
        source_table: str,
        source_id: str,
        occurred_at: datetime = None,
        summary: str = None,
        payload: Dict = None
    ) -> Optional[Dict]:
        """
        Add an event to the patient timeline.
        
        event_type: 'appointment', 'paraclinic', 'plan', 'followup', 'payment'
        source_table: Name of the source table
        """
        if not self.client:
            return None
        
        try:
            data = {
                "id": str(uuid4()),
                "patient_id": patient_id,
                "occurred_at": (occurred_at or datetime.now()).isoformat(),
                "event_type": event_type,
                "source_table": source_table,
                "source_id": source_id,
                "summary": summary,
                "payload": payload
            }
            
            result = self.client.table("patient_timeline_events").insert(data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error adding timeline event: {e}")
            return None
    
    def get_by_patient(
        self,
        patient_id: str,
        limit: int = 20,
        event_type: str = None
    ) -> List[Dict]:
        """Get timeline events for a patient."""
        if not self.client:
            return []
        
        try:
            query = self.client.table("patient_timeline_events").select("*").eq(
                "patient_id", patient_id
            ).order("occurred_at", desc=True).limit(limit)
            
            if event_type:
                query = query.eq("event_type", event_type)
            
            result = query.execute()
            return result.data or []
        except Exception:
            return []


class PlanRepository:
    """
    Repository for treatment plans (medications, prescriptions).
    Maps to: plans table in Supabase.
    """
    
    def __init__(self):
        self.client = get_supabase_client()
    
    def get_active_by_patient(self, patient_id: str) -> List[Dict]:
        """Get active plans for a patient (via appointments)."""
        if not self.client:
            return []
        
        try:
            # Get patient's appointments
            appointments = self.client.table("appointments").select(
                "id"
            ).eq("patient_id", patient_id).execute()
            
            if not appointments.data:
                return []
            
            appointment_ids = [a["id"] for a in appointments.data]
            
            # Get plans for those appointments
            today = date.today().isoformat()
            result = self.client.table("plans").select("*").in_(
                "appointment_id", appointment_ids
            ).or_(f"end_date.is.null,end_date.gte.{today}").execute()
            
            return result.data or []
        except Exception:
            return []
    
    def create(
        self,
        appointment_id: str,
        plan_data: Dict,
        start_date: date = None,
        end_date: date = None
    ) -> Optional[Dict]:
        """Create a new plan."""
        if not self.client:
            return None
        
        try:
            data = {
                "id": str(uuid4()),
                "appointment_id": appointment_id,
                "plan": plan_data,
                "start_date": (start_date or date.today()).isoformat(),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            if end_date:
                data["end_date"] = end_date.isoformat()
            
            result = self.client.table("plans").insert(data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error creating plan: {e}")
            return None

