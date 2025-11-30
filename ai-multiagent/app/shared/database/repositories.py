"""Repository classes for database operations."""

from datetime import date, datetime
from typing import Any, Optional
from uuid import uuid4

from .client import get_supabase_client


def normalize_phone(phone: str) -> str:
    """Normalize phone number to E.164 format with + prefix."""
    return phone if phone.startswith("+") else f"+{phone}"


class PatientRepository:
    """Repository for patient data."""

    def __init__(self):
        self.client = get_supabase_client()

    def get_by_phone(self, phone: str) -> Optional[dict]:
        """Get patient by phone number.

        Phone is normalized to E.164 format (+prefix) for consistent lookups.
        """
        if not self.client:
            return None

        try:
            # Normalize phone to E.164 format
            normalized = normalize_phone(phone)

            result = (
                self.client.table("users")
                .select("*, patients(*)")
                .eq("phone", normalized)
                .single()
                .execute()
            )
            if result.data:
                return self._format_patient(result.data)
            return None
        except Exception as e:
            print(f"Error getting patient by phone {phone}: {e}")
            return None

    def get_by_id(self, patient_id: str) -> Optional[dict]:
        """Get patient by ID."""
        if not self.client:
            return None

        try:
            result = (
                self.client.table("patients")
                .select("*, users(*)")
                .eq("id", patient_id)
                .single()
                .execute()
            )
            if result.data:
                return self._format_patient_reverse(result.data)
            return None
        except Exception:
            return None

    def create_or_update(self, phone: str, data: dict) -> Optional[dict]:
        """Update an existing patient by phone number.

        NOTE: This method no longer creates new users/patients.
        User creation is handled by wa-agent-gateway via Supabase Auth.
        This method only updates existing records.
        """
        if not self.client:
            return None

        try:
            existing = self.get_by_phone(phone)
            if existing:
                return self._update_patient(existing["id"], data)
            else:
                # User doesn't exist - wa-agent-gateway should create them first
                print(f"⚠️ No user found for phone {phone}. Check wa-agent-gateway.")
                return None
        except Exception as e:
            print(f"Error updating patient: {e}")
            return None

    def create_patient_record(self, user_id: str, data: dict) -> Optional[dict]:
        """Create a patient record for an existing user.

        Use this when a user exists but doesn't have a patient record yet.
        The user must already exist in public.users (created via Supabase Auth).

        Args:
            user_id: The user's UUID (must exist in public.users)
            data: Patient data including dni and clinical_profile

        Returns:
            Created patient data or None if creation failed
        """
        if not self.client:
            return None

        try:
            # Check if patient record already exists
            existing = self.get_by_id(user_id)
            if existing:
                return existing

            # Create patient record
            patient_data = {
                "id": user_id,
                "dni": data.get("dni", f"TEMP-{user_id[:8]}"),
                "clinical_profile_json": data.get("clinical_profile", {"onboarding_state": "new"}),
            }

            self.client.table("patients").insert(patient_data).execute()
            return self.get_by_id(user_id)
        except Exception as e:
            print(f"Error creating patient record: {e}")
            return None

    def _update_patient(self, patient_id: str, data: dict) -> Optional[dict]:
        """Update existing patient.

        Updates users table for name/birth_date.
        Updates patients table for clinical_profile.
        """
        try:
            # Update users table (name, birth_date)
            user_updates: dict[str, Any] = {"updated_at": datetime.now().isoformat()}
            if data.get("name"):
                user_updates["full_name"] = data["name"]
                print(f"📝 Updating user {patient_id} full_name to: {data['name']}")
            if data.get("birth_date"):
                user_updates["birth_date"] = data["birth_date"]

            result = self.client.table("users").update(user_updates).eq("id", patient_id).execute()
            if not result.data:
                print(f"⚠️ No rows updated for user {patient_id} - user may not exist")

            # Update patients table (clinical_profile)
            if data.get("clinical_profile"):
                patient_result = (
                    self.client.table("patients")
                    .update({"clinical_profile_json": data["clinical_profile"]})
                    .eq("id", patient_id)
                    .execute()
                )
                if not patient_result.data:
                    print(f"⚠️ No rows updated for patient {patient_id} - patient may not exist")

            return self.get_by_id(patient_id)
        except Exception as e:
            print(f"❌ Error updating patient {patient_id}: {e}")
            return None

    def update_clinical_profile(self, patient_id: str, profile: dict) -> None:
        """Update patient's clinical profile JSON."""
        if not self.client:
            return

        try:
            self.client.table("patients").update({"clinical_profile_json": profile}).eq(
                "id", patient_id
            ).execute()
        except Exception as e:
            print(f"Error updating clinical profile: {e}")

    def _format_patient(self, data: dict) -> dict:
        """Format user+patient data for the agent."""
        patient_data = data.get("patients", {}) or {}
        return {
            "id": data["id"],
            "phone": data.get("phone"),
            "name": data.get("full_name"),
            "email": data.get("email"),
            "birth_date": data.get("birth_date"),
            "dni": patient_data.get("dni") if isinstance(patient_data, dict) else None,
            "clinical_profile": (
                patient_data.get("clinical_profile_json", {})
                if isinstance(patient_data, dict)
                else {}
            ),
            "created_at": data.get("created_at"),
            "updated_at": data.get("updated_at"),
        }

    def _format_patient_reverse(self, data: dict) -> dict:
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
            "updated_at": user_data.get("updated_at"),
        }


class FollowingRepository:
    """Repository for follow-up interactions (WhatsApp conversations)."""

    def __init__(self):
        self.client = get_supabase_client()

    def create(
        self,
        patient_id: str,
        following_type: str,
        summary: str | None = None,
        severity_score: int | None = None,
        is_urgent: bool = False,
        message_count: int = 1,
        appointment_id: str | None = None,
        transcript_url: str | None = None,
        conversation_id: str | None = None,
    ) -> Optional[dict]:
        """Create a new following record.

        Args:
            patient_id: The patient's UUID
            following_type: Type of following (emotional, symptoms, medications, business, other)
            summary: Brief description of the interaction
            severity_score: 0-10 severity score
            is_urgent: Whether this requires immediate attention
            message_count: Number of messages in this interaction
            appointment_id: Optional linked appointment UUID
            transcript_url: Optional URL to conversation transcript
            conversation_id: Optional conversation UUID for CMS mapping
        """
        if not self.client:
            return None

        try:
            data: dict[str, Any] = {
                "id": str(uuid4()),
                "patient_id": patient_id,
                "type": following_type,
                "channel": "whatsapp",
                "contacted_at": datetime.now().isoformat(),
                "message_count": message_count,
                "summary": summary,
                "severity_score": severity_score,
                "is_urgent": is_urgent,
                "created_at": datetime.now().isoformat(),
            }

            if appointment_id:
                data["appointment_id"] = appointment_id
            if transcript_url:
                data["transcript_url"] = transcript_url
            if conversation_id:
                data["conversation_id"] = conversation_id

            result = self.client.table("followings").insert(data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error creating following: {e}")
            return None

    def get_by_patient(
        self,
        patient_id: str,
        limit: int = 10,
        following_type: str | None = None,
    ) -> list[dict]:
        """Get recent followings for a patient."""
        if not self.client:
            return []

        try:
            query = (
                self.client.table("followings")
                .select("*")
                .eq("patient_id", patient_id)
                .order("contacted_at", desc=True)
                .limit(limit)
            )

            if following_type:
                query = query.eq("type", following_type)

            result = query.execute()
            return result.data or []
        except Exception:
            return []

    def get_urgent_by_patient(self, patient_id: str) -> list[dict]:
        """Get urgent followings for a patient."""
        if not self.client:
            return []

        try:
            result = (
                self.client.table("followings")
                .select("*")
                .eq("patient_id", patient_id)
                .eq("is_urgent", True)
                .order("contacted_at", desc=True)
                .execute()
            )
            return result.data or []
        except Exception:
            return []

    def update_message_count(self, following_id: str, count: int) -> None:
        """Update message count for a following."""
        if not self.client:
            return

        try:
            self.client.table("followings").update({"message_count": count}).eq(
                "id", following_id
            ).execute()
        except Exception:
            pass


class AppointmentRepository:
    """Repository for appointments."""

    def __init__(self):
        self.client = get_supabase_client()

    def get_by_patient(
        self,
        patient_id: str,
        status: str | None = None,
        upcoming_only: bool = False,
        include_past: bool = False,
        limit: int = 10,
    ) -> list[dict]:
        """Get appointments for a patient."""
        if not self.client:
            return []

        try:
            query = (
                self.client.table("appointments")
                .select("*, doctors(users(full_name))")
                .eq("patient_id", patient_id)
                .order("scheduled_at", desc=False)
                .limit(limit)
            )

            if status:
                query = query.eq("status", status)

            if upcoming_only or not include_past:
                query = query.gte("scheduled_at", datetime.now().isoformat())

            result = query.execute()
            return [self._format_appointment(a) for a in (result.data or [])]
        except Exception:
            return []

    def get_by_id(self, appointment_id: str, patient_id: str | None = None) -> Optional[dict]:
        """Get a specific appointment by ID."""
        if not self.client:
            return None

        try:
            query = (
                self.client.table("appointments")
                .select("*, doctors(users(full_name))")
                .eq("id", appointment_id)
            )

            if patient_id:
                query = query.eq("patient_id", patient_id)

            result = query.single().execute()
            if result.data:
                return self._format_appointment(result.data)
            return None
        except Exception:
            return None

    def get_upcoming(self, patient_id: str, limit: int = 5) -> list[dict]:
        """Get upcoming appointments."""
        return self.get_by_patient(patient_id, status="scheduled", upcoming_only=True)[:limit]

    def create(
        self,
        patient_id: str,
        doctor_id: str,
        scheduled_at: datetime,
        appointment_type: str = "consulta",
        notes: str | None = None,
        conversation_id: str | None = None,
    ) -> Optional[dict]:
        """Create a new appointment.

        Args:
            patient_id: The patient's UUID
            doctor_id: The doctor's UUID
            scheduled_at: Appointment datetime
            appointment_type: Type of appointment (pre_consulta, consulta)
            notes: Optional notes for the appointment
            conversation_id: Optional conversation UUID for CMS mapping
        """
        if not self.client:
            return None

        try:
            data: dict[str, Any] = {
                "id": str(uuid4()),
                "patient_id": patient_id,
                "doctor_id": doctor_id,
                "type": appointment_type,
                "status": "scheduled",
                "scheduled_at": scheduled_at.isoformat(),
                "notes": notes,
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
            }

            if conversation_id:
                data["conversation_id"] = conversation_id

            result = self.client.table("appointments").insert(data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error creating appointment: {e}")
            return None

    def update_status(self, appointment_id: str, status: str, notes: str | None = None) -> None:
        """Update appointment status."""
        if not self.client:
            return

        try:
            updates: dict[str, Any] = {
                "status": status,
                "updated_at": datetime.now().isoformat(),
            }
            if notes:
                updates["notes"] = notes

            self.client.table("appointments").update(updates).eq("id", appointment_id).execute()
        except Exception:
            pass

    def _format_appointment(self, data: dict) -> dict:
        """Format appointment for the agent."""
        doctor_info = data.get("doctors", {})
        doctor_user = doctor_info.get("users", {}) if doctor_info else {}

        scheduled = data.get("scheduled_at", "")
        scheduled_dt = None
        if scheduled:
            try:
                scheduled_dt = datetime.fromisoformat(scheduled.replace("Z", "+00:00"))
            except Exception:
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
            "created_at": data.get("created_at"),
        }


class TimelineRepository:
    """Repository for patient timeline events."""

    def __init__(self):
        self.client = get_supabase_client()

    def add_event(
        self,
        patient_id: str,
        event_type: str,
        source_table: str,
        source_id: str,
        occurred_at: datetime | None = None,
        summary: str | None = None,
        payload: dict | None = None,
    ) -> Optional[dict]:
        """Add an event to the patient timeline."""
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
                "payload": payload,
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
        event_type: str | None = None,
    ) -> list[dict]:
        """Get timeline events for a patient."""
        if not self.client:
            return []

        try:
            query = (
                self.client.table("patient_timeline_events")
                .select("*")
                .eq("patient_id", patient_id)
                .order("occurred_at", desc=True)
                .limit(limit)
            )

            if event_type:
                query = query.eq("event_type", event_type)

            result = query.execute()
            return result.data or []
        except Exception:
            return []


class PlanRepository:
    """Repository for treatment plans (medications, prescriptions)."""

    def __init__(self):
        self.client = get_supabase_client()

    def get_active_by_patient(self, patient_id: str) -> list[dict]:
        """Get active plans for a patient (via appointments)."""
        if not self.client:
            return []

        try:
            appointments = (
                self.client.table("appointments")
                .select("id")
                .eq("patient_id", patient_id)
                .execute()
            )

            if not appointments.data:
                return []

            appointment_ids = [a["id"] for a in appointments.data]
            today = date.today().isoformat()

            result = (
                self.client.table("plans")
                .select("*")
                .in_("appointment_id", appointment_ids)
                .or_(f"end_date.is.null,end_date.gte.{today}")
                .execute()
            )

            return result.data or []
        except Exception:
            return []

    def create(
        self,
        appointment_id: str,
        plan_data: dict,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> Optional[dict]:
        """Create a new plan."""
        if not self.client:
            return None

        try:
            data: dict[str, Any] = {
                "id": str(uuid4()),
                "appointment_id": appointment_id,
                "plan": plan_data,
                "start_date": (start_date or date.today()).isoformat(),
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat(),
            }

            if end_date:
                data["end_date"] = end_date.isoformat()

            result = self.client.table("plans").insert(data).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error creating plan: {e}")
            return None
