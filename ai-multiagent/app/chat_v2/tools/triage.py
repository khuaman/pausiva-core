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
    """Assess symptoms reported by patient and classify risk level (FLUJO 6).

    WHEN TO USE:
    - Patient mentions ANY physical symptoms: dolor, cansancio, bochornos, mareo, náusea, etc.
    - Patient mentions emotional symptoms: ansiedad, depresión, insomnio, tristeza
    - Patient says they feel unwell: "me siento mal", "no estoy bien"
    - Patient describes concerning sensations

    SYMPTOM KEYWORDS TO DETECT (trigger this tool):
    - Physical: dolor, molestia, cansada, fatiga, mareo, náusea, fiebre, bochornos
    - Emotional: ansiedad, depresión, insomnio, estrés, tristeza, preocupada
    - Urgent: no puedo respirar, dolor en el pecho, sangrado, desmayo

    WHAT IT RETURNS:
    - risk_level: "none", "low", "medium", "high"
    - risk_score: 0-100
    - requires_urgent_attention: boolean
    - symptom_summary: brief summary
    - recommended_actions: list of action codes

    RISK LEVEL RESPONSE GUIDANCE (FLUJO 6):

    HIGH (risk_score >= 80):
    - IMMEDIATELY recommend emergency services
    - Provide emergency numbers: Emergencias 105, Salud en Casa 107
    - Ask if someone can accompany them
    - DO NOT try to diagnose or minimize

    MEDIUM (risk_score 40-79):
    - Recommend scheduling appointment with doctor
    - Provide self-care recommendations from FLUJO 6.2
    - Be empathetic and validating

    LOW (risk_score 0-39):
    - Provide comfort and self-care recommendations
    - Remind these are general tips, not medical advice
    - Offer to continue conversation

    IMPORTANT - AFTER CALLING THIS TOOL:
    - Call record_symptom_report() to persist the assessment
    - If risk_level="high" → creates is_urgent following for dashboard alert

    Args:
        phone: Patient phone number
        symptom_description: Exact text of what patient described (copy from their message)
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
    """Record a symptom report to persist in patient history (creates a following).

    WHEN TO USE:
    - ALWAYS call this AFTER assess_symptoms() to save the assessment
    - This creates a following with type="symptoms" for dashboard tracking

    TYPICAL FLOW (FLUJO 6):
    1. Patient reports symptoms
    2. assess_symptoms(phone, symptom_description) → get risk_level, risk_score
    3. record_symptom_report(phone, symptom_description, risk_level, risk_score) → persist
    4. Respond to patient based on risk level

    IMPORTANT:
    - This tool already creates a following record, don't call create_following() separately
    - The symptom_description is truncated to 500 chars for storage
    - If risk_level="high", sets is_urgent=True automatically (triggers dashboard alert)

    WHAT IT CREATES:
    - following with type="symptoms"
    - severity_score from the risk_score
    - is_urgent=True if risk_level was "high"
    - summary from symptom_description

    Args:
        phone: Patient phone number
        symptom_description: What the patient described (use same text as assess_symptoms)
        risk_level: From assess_symptoms result - "none", "low", "medium", "high"
        risk_score: From assess_symptoms result - 0-100
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
    """Get patient's history of symptom reports for context and continuity.

    WHEN TO USE:
    - Before responding to new symptoms: check if it's a recurring issue
    - To provide continuity: "Veo que la semana pasada mencionaste bochornos..."
    - To identify patterns: multiple reports of same symptom over time
    - When patient asks about their history

    USING HISTORY FOR BETTER RESPONSES:
    - If same symptom appears multiple times: "Noto que esto ha sido recurrente. ¿Ha empeorado?"
    - If previous severity was high: Be extra attentive to current state
    - If symptoms are improving: Acknowledge positive progress
    - If new symptom: "Es la primera vez que mencionas esto..."

    RETURNS list of symptom following records with:
    - summary: symptom description
    - severity_score: 0-100
    - is_urgent: was it flagged as urgent
    - contacted_at: when they reported it

    IMPORTANT:
    - This is a FILTERED view: only type="symptoms" followings
    - For complete history including business/emotional, use get_followings()

    Args:
        phone: Patient phone number
        limit: Max records to return (default 10, most recent first)
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

