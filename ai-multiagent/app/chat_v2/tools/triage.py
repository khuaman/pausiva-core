"""Triage/symptom assessment tools for Chat V2 agent."""

from typing import Literal, Optional

from langchain_core.tools import tool

from app.shared.database import FollowingRepository, PatientRepository

# Risk assessment keywords
HIGH_RISK_KEYWORDS = [
    "no puedo respirar",
    "dolor en el pecho",
    "dolor intenso",
    "sangrado",
    "desmayo",
    "suicid",
    "morir",
    "matar",
    "urgencia",
    "emergencia",
    "ayuda urgente",
]

MEDIUM_RISK_KEYWORDS = [
    "varios días",
    "empeora",
    "no mejora",
    "preocupa",
    "ansiedad",
    "depresión",
    "insomnio",
    "no puedo dormir",
    "efecto secundario",
    "reacción",
]

SYMPTOM_KEYWORDS = [
    "dolor",
    "molestia",
    "cansada",
    "cansancio",
    "fatiga",
    "mareo",
    "náusea",
    "fiebre",
    "mal",
    "síntoma",
]


RiskLevel = Literal["none", "low", "medium", "high"]


def _quick_assess(message: str) -> tuple[RiskLevel, int]:
    """
    Quick risk assessment based on keywords.
    Returns (risk_level, risk_score 0-100).
    """
    message_lower = message.lower()

    # Check high risk
    for keyword in HIGH_RISK_KEYWORDS:
        if keyword in message_lower:
            return ("high", 85)

    # Check medium risk
    for keyword in MEDIUM_RISK_KEYWORDS:
        if keyword in message_lower:
            return ("medium", 50)

    # Check symptom mentions
    for keyword in SYMPTOM_KEYWORDS:
        if keyword in message_lower:
            return ("low", 25)

    return ("none", 0)


@tool
def assess_symptoms(
    phone: str,
    symptom_description: str,
) -> dict:
    """
    Assess symptoms reported by a patient and classify risk level.

    Use this tool when the patient describes physical or emotional symptoms.
    It performs a quick keyword-based risk assessment.

    Args:
        phone: Patient phone number (for context lookup)
        symptom_description: The symptom description from the patient

    Returns:
        Dictionary with:
        - risk_level: "none", "low", "medium", or "high"
        - risk_score: 0-100 score
        - requires_urgent_attention: boolean
        - symptom_summary: summarized symptoms
        - recommended_actions: list of recommended actions
    """
    risk_level, risk_score = _quick_assess(symptom_description)

    # Determine actions
    actions = ["SEND_EMPATHETIC_RESPONSE"]
    requires_urgent = False

    if risk_level == "high":
        actions = [
            "RECOMMEND_IMMEDIATE_CARE",
            "ALERT_MEDICAL_STAFF",
            "PROVIDE_EMERGENCY_CONTACTS",
        ]
        requires_urgent = True
    elif risk_level == "medium":
        actions = [
            "RECOMMEND_SCHEDULE_APPOINTMENT",
            "FOLLOW_UP_NEEDED",
        ]
    elif risk_level == "low":
        actions = [
            "PROVIDE_COMFORT",
            "MONITOR_SYMPTOMS",
        ]

    return {
        "risk_level": risk_level,
        "risk_score": risk_score,
        "requires_urgent_attention": requires_urgent,
        "symptom_summary": symptom_description[:200],
        "recommended_actions": actions,
    }


@tool
def record_symptom_report(
    phone: str,
    symptom_description: str,
    risk_level: RiskLevel = "none",
    risk_score: int = 0,
) -> Optional[dict]:
    """
    Record a symptom report in the patient's history.

    Use this tool after assessing symptoms to create a following record
    for tracking purposes.

    Args:
        phone: Patient phone number
        symptom_description: Description of the symptoms
        risk_level: Assessed risk level
        risk_score: Risk score 0-100

    Returns:
        Created following record, or None if creation failed.
    """
    patient_repo = PatientRepository()
    following_repo = FollowingRepository()

    # Look up patient
    patient = patient_repo.get_by_phone(phone)
    if not patient:
        return None

    return following_repo.create(
        patient_id=patient["id"],
        following_type="symptoms",
        summary=symptom_description[:500],
        severity_score=risk_score,
        is_urgent=risk_level == "high",
    )


@tool
def get_symptom_history(phone: str, limit: int = 10) -> list[dict]:
    """
    Get recent symptom reports for a patient.

    Use this tool to understand the patient's symptom history
    and provide better contextual responses.

    Args:
        phone: Patient phone number
        limit: Maximum number of records (default: 10)

    Returns:
        List of symptom following records, most recent first.
    """
    patient_repo = PatientRepository()
    following_repo = FollowingRepository()

    # Look up patient
    patient = patient_repo.get_by_phone(phone)
    if not patient:
        return []

    return following_repo.get_by_patient(
        patient_id=patient["id"],
        limit=limit,
        following_type="symptoms",
    )


# Export all tools
TRIAGE_TOOLS = [
    assess_symptoms,
    record_symptom_report,
    get_symptom_history,
]

