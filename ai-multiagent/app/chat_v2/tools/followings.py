"""Followings management tools for Chat V2 agent."""

from typing import Literal, Optional

from langchain_core.tools import tool

from app.shared.database import FollowingRepository, PatientRepository


FollowingType = Literal["emotional", "symptoms", "medications", "business", "other"]


@tool
def create_following(
    phone: str,
    following_type: FollowingType,
    summary: Optional[str] = None,
    severity_score: Optional[int] = None,
    is_urgent: bool = False,
    appointment_id: Optional[str] = None,
) -> Optional[dict]:
    """Create a following record to track patient interactions for the dashboard.

    WHEN TO AUTO-CREATE FOLLOWINGS (you should call this automatically):
    1. FLUJO 1 (Onboarding): type="business"
       - After welcome message: summary="Onboarding iniciado"
       - After collecting name: summary="Onboarding: información inicial capturada"
       - After scheduling: summary="Consulta gratuita agendada"

    2. FLUJO 6 (Symptoms): type="symptoms"
       - ALWAYS call AFTER assess_symptoms() to persist the assessment
       - Use the risk_score from assess_symptoms as severity_score
       - Set is_urgent=True if risk_level was "high"

    3. Post-appointment: type="medications"
       - After sending prescriptions: summary="Prescripciones enviadas"
       - Link to appointment_id

    FOLLOWING TYPES:
    - "business": Onboarding, sales, administrative interactions
    - "symptoms": Physical symptom reports (FLUJO 6)
    - "emotional": Emotional check-ins, anxiety, mood-related
    - "medications": Prescription-related, medication reminders
    - "other": Miscellaneous conversations

    SEVERITY SCORE GUIDELINES (0-100):
    - 0-25: Low concern, routine interaction
    - 26-50: Moderate, worth monitoring but not urgent
    - 51-75: Elevated concern, should follow up soon
    - 76-100: High priority, requires attention → set is_urgent=True

    IMPORTANT:
    - Following records appear in the staff dashboard for patient monitoring
    - is_urgent=True triggers an alert in the dashboard (OPEN_RISK_ALERT)
    - summary should be concise but informative (max ~200 chars)

    TOOL COMBINATION - Typical sequences:
    - assess_symptoms() → create_following(type="symptoms", severity_score=X)
    - record_symptom_report() already creates a following, don't duplicate!

    Args:
        phone: Patient phone number
        following_type: "emotional" | "symptoms" | "medications" | "business" | "other"
        summary: Brief description of interaction (e.g., "Reporta bochornos intensos")
        severity_score: 0-100, use result from assess_symptoms when applicable
        is_urgent: True if requires immediate staff attention (HIGH risk symptoms)
        appointment_id: Link to related appointment UUID if applicable
    """
    patient_repo = PatientRepository()
    following_repo = FollowingRepository()

    # Look up patient by phone
    patient = patient_repo.get_by_phone(phone)
    if not patient:
        return None

    patient_id = patient["id"]

    return following_repo.create(
        patient_id=patient_id,
        following_type=following_type,
        summary=summary,
        severity_score=severity_score,
        is_urgent=is_urgent,
        appointment_id=appointment_id,
    )


@tool
def get_followings(
    phone: str,
    following_type: Optional[FollowingType] = None,
    limit: int = 10,
) -> list[dict]:
    """Get recent following records to understand patient history and context.

    WHEN TO USE:
    - Before responding to symptoms: check if they've reported similar issues before
    - To understand patient's journey: check "business" type for onboarding progress
    - To provide continuity: "La última vez mencionaste que..."
    - To check for patterns: multiple symptom reports over time

    USER INTENT TO TOOL MAPPING:
    - "¿Qué hemos hablado antes?" → get_followings(phone, limit=5)
    - Patient reports symptoms → get_followings(phone, following_type="symptoms") to check history
    - Check onboarding status → get_followings(phone, following_type="business")

    RETURNS list of records with:
    - type: emotional, symptoms, medications, business, other
    - summary: description of the interaction
    - severity_score: 0-100 if set
    - is_urgent: boolean
    - contacted_at: when it happened
    - appointment_id: linked appointment if any

    USING HISTORY FOR BETTER RESPONSES:
    - If previous symptom reports exist: "Veo que hace unos días mencionaste [síntoma]. ¿Cómo ha evolucionado?"
    - If high severity history: Be more attentive, consider recommending appointment
    - If no history: This is likely a new topic for them

    Args:
        phone: Patient phone number
        following_type: Filter to specific type, or None for all types
        limit: Max records to return (default 10, most recent first)
    """
    patient_repo = PatientRepository()
    following_repo = FollowingRepository()

    # Look up patient by phone
    patient = patient_repo.get_by_phone(phone)
    if not patient:
        return []

    patient_id = patient["id"]

    return following_repo.get_by_patient(
        patient_id=patient_id,
        limit=limit,
        following_type=following_type,
    )


@tool
def get_urgent_followings(phone: str) -> list[dict]:
    """Get any URGENT following records that may need immediate attention.

    WHEN TO USE:
    - At start of conversation to check if there are unresolved urgent issues
    - After a patient messages back to see if they had a previous urgent flag
    - To prioritize conversation topics

    RETURNS:
    - List of followings where is_urgent=True
    - Empty list if no urgent issues

    RESPONSE GUIDANCE:
    - If urgent followings exist: Address them first, ask about their status
      "Veo que la última vez mencionaste algo urgente sobre [resumen]. ¿Cómo estás ahora?"
    - If empty: Proceed with normal conversation flow

    IMPORTANT:
    - Urgent flags are set when assess_symptoms returns risk_level="high"
    - These appear as alerts in staff dashboard
    - Should be acknowledged/addressed even if patient writes about something else

    Args:
        phone: Patient phone number
    """
    patient_repo = PatientRepository()
    following_repo = FollowingRepository()

    # Look up patient by phone
    patient = patient_repo.get_by_phone(phone)
    if not patient:
        return []

    patient_id = patient["id"]

    return following_repo.get_urgent_by_patient(patient_id)


# Export all tools
FOLLOWING_TOOLS = [
    create_following,
    get_followings,
    get_urgent_followings,
]

