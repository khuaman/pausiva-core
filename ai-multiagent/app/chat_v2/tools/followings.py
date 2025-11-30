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
    """
    Create a new following record for tracking patient interactions.

    Use this tool to record:
    - Onboarding interactions (type="business")
    - Symptom reports (type="symptoms")
    - Emotional check-ins (type="emotional")
    - Medication-related conversations (type="medications")

    Args:
        phone: Patient phone number (to look up patient_id)
        following_type: Type of following - one of:
            - "emotional": Emotional state check-ins
            - "symptoms": Symptom reports
            - "medications": Medication-related
            - "business": Onboarding, sales, administrative
            - "other": Miscellaneous
        summary: Brief summary of the interaction (optional)
        severity_score: Risk/severity score 0-100 (optional)
        is_urgent: Whether this requires urgent attention
        appointment_id: Related appointment ID if applicable (optional)

    Returns:
        Created following record, or None if creation failed.
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
    """
    Get recent following records for a patient.

    Use this tool to check interaction history, especially:
    - Previous symptom reports
    - Emotional check-in history
    - Onboarding progress

    Args:
        phone: Patient phone number
        following_type: Filter by type (optional)
        limit: Maximum number of records to return (default: 10)

    Returns:
        List of following records, most recent first.
        Empty list if patient not found or no records exist.
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
    """
    Get urgent following records for a patient.

    Use this tool to check if there are any urgent/unresolved issues
    that need immediate attention.

    Args:
        phone: Patient phone number

    Returns:
        List of urgent following records.
        Empty list if patient not found or no urgent records.
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

