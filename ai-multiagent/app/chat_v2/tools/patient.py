"""Patient management tools for Chat V2 agent."""

from typing import Optional

from langchain_core.tools import tool

from app.shared.database import PatientRepository


@tool
def get_patient_by_phone(phone: str) -> Optional[dict]:
    """Look up a patient by their phone number to determine if they exist in the system.

    WHEN TO USE:
    - At the START of every conversation to check if this is a new or existing patient
    - Before any other tool that requires patient context
    - When you need to check onboarding_state or clinical_profile

    WHAT IT RETURNS:
    - If patient EXISTS: dict with id, name, phone, clinical_profile_json (contains onboarding_state, medications, etc.)
    - If patient NOT FOUND: None (this means it's a NEW patient starting onboarding)

    DECISION TREE based on result:
    1. Result is None → New patient, start FLUJO 1 (Onboarding): welcome message, collect name
    2. Result exists but clinical_profile_json.onboarding_state = "new" or "collecting_info" → Continue onboarding
    3. Result exists with onboarding_state = "completed" → Existing patient, handle their request normally

    IMPORTANT:
    - This should typically be the FIRST tool called in any conversation
    - The phone number is provided in the conversation context, use it exactly as given
    - Do NOT create patients with this tool, patients are created by wa-agent-gateway when they first message

    Args:
        phone: Patient phone number exactly as provided in context (e.g., "+51999999999")
    """
    repo = PatientRepository()
    return repo.get_by_phone(phone)


@tool
def update_patient_info(
    phone: str,
    name: str = "",
    email: str = "",
    birth_date: str = "",
    clinical_profile: Optional[dict] = None,
) -> Optional[dict]:
    """Update patient information during onboarding or conversation.

    WHEN TO USE:
    - During FLUJO 1.2: After patient provides their name ("me llamo María", "soy Ana", "mi nombre es Laura")
    - When patient voluntarily shares personal info (email, birth date)
    - When updating clinical_profile with collected health information

    NAME EXTRACTION PATTERNS - look for:
    - "me llamo X" → name = X
    - "soy X" → name = X
    - "mi nombre es X" → name = X
    - Just a name as response to "¿cómo te llamas?" → name = that response

    IMPORTANT:
    - Patient MUST already exist (created by wa-agent-gateway on first WhatsApp message)
    - This tool only UPDATES, it does NOT create new patients
    - Only pass parameters that have actual values - leave others empty
    - After updating name during onboarding, you should ALSO call update_onboarding_state()

    TYPICAL ONBOARDING SEQUENCE:
    1. get_patient_by_phone() → check patient exists
    2. update_patient_info(phone, name="María") → save extracted name
    3. update_onboarding_state(phone, "scheduling_appointment") → advance state
    4. create_following(phone, "business", summary="Onboarding: información inicial capturada")

    Args:
        phone: Patient phone number (to identify the patient)
        name: Patient full name - extract from conversation, use proper capitalization
        email: Patient email (optional)
        birth_date: Patient birth date in YYYY-MM-DD format (optional)
        clinical_profile: Clinical profile data dict to merge (optional, advanced use)
    """
    repo = PatientRepository()

    # First check if patient exists
    existing = repo.get_by_phone(phone)
    if not existing:
        # Patient should have been created by wa-agent-gateway
        print(
            f"Warning: Patient not found for phone {phone}. They should have been created when they first messaged."
        )
        return None

    data: dict = {}
    if name:
        data["name"] = name
    if email:
        data["email"] = email
    if birth_date:
        data["birth_date"] = birth_date
    if clinical_profile:
        data["clinical_profile"] = clinical_profile

    if not data:
        # Nothing to update, return current data
        return existing

    return repo.create_or_update(phone, data)


@tool
def update_onboarding_state(
    phone: str,
    new_state: str,
    additional_data: Optional[dict] = None,
) -> Optional[dict]:
    """Update the onboarding state for a patient to track progress through FLUJO 1.

    ONBOARDING STATE MACHINE (must progress sequentially):
    1. "new" → Patient just started, hasn't provided any info yet
    2. "collecting_info" → After sending welcome message, waiting for name/needs
    3. "scheduling_appointment" → After collecting name, ready to send Taycal link
    4. "completed" → After patient schedules via Taycal (or explicitly declines)

    WHEN TO TRANSITION:
    - "new" → "collecting_info": After sending welcome message in FLUJO 1.1
    - "collecting_info" → "scheduling_appointment": After extracting name in FLUJO 1.2
    - "scheduling_appointment" → "completed": After Taycal webhook confirms appointment (FLUJO 1.3)

    IMPORTANT:
    - NEVER skip states (don't go from "new" to "completed" directly)
    - After transitioning to "scheduling_appointment", send the Taycal scheduling link
    - Use additional_data to store context like: {"initial_needs": "bochornos y cansancio"}

    TOOL COMBINATION - After updating state, typically also call:
    - create_following(phone, "business", summary="Onboarding: [description of step]")

    Args:
        phone: Patient phone number
        new_state: One of: "new", "collecting_info", "scheduling_appointment", "completed"
        additional_data: Extra data to merge into clinical_profile, e.g.:
            - {"initial_needs": "descripción de síntomas"}
            - {"collected_name": true}
            - {"first_consultation_scheduled": true}
    """
    repo = PatientRepository()

    # Get current patient to merge clinical profile
    patient = repo.get_by_phone(phone)
    if not patient:
        return None

    current_profile = patient.get("clinical_profile", {}) or {}
    current_profile["onboarding_state"] = new_state

    if additional_data:
        current_profile.update(additional_data)

    return repo.create_or_update(phone, {"clinical_profile": current_profile})


# Export all tools
PATIENT_TOOLS = [
    get_patient_by_phone,
    update_patient_info,
    update_onboarding_state,
]
