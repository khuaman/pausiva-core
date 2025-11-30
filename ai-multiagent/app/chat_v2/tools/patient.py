"""Patient management tools for Chat V2 agent."""

from typing import Optional

from langchain_core.tools import tool

from app.shared.database import PatientRepository


@tool
def get_patient_by_phone(phone: str) -> Optional[dict]:
    """
    Look up a patient by their phone number.

    Use this tool to check if a patient exists in the system.
    Returns None if the patient is not found (new patient).

    Args:
        phone: Patient phone number (e.g., "+51999999999")

    Returns:
        Patient data dictionary with id, name, phone, clinical_profile, etc.
        Returns None if patient not found.
    """
    repo = PatientRepository()
    return repo.get_by_phone(phone)


@tool
def create_patient(
    phone: str,
    name: str = "",
    email: str = "",
    birth_date: str = "",
    clinical_profile: Optional[dict] = None,
) -> Optional[dict]:
    """
    Create a new patient record.

    Use this tool when a new patient needs to be registered in the system.
    Call this after collecting basic information from the patient during onboarding.

    Args:
        phone: Patient phone number (required)
        name: Patient full name (can be empty initially, updated later)
        email: Patient email (optional)
        birth_date: Patient birth date in YYYY-MM-DD format (optional)
        clinical_profile: Initial clinical profile data (optional)

    Returns:
        Created patient data dictionary, or None if creation failed.
    """
    repo = PatientRepository()
    data = {
        "name": name,
        "email": email,
        "clinical_profile": clinical_profile or {"onboarding_state": "collecting_info"},
    }
    if birth_date:
        data["birth_date"] = birth_date

    return repo.create_or_update(phone, data)


@tool
def update_patient(
    phone: str,
    name: Optional[str] = None,
    email: Optional[str] = None,
    birth_date: Optional[str] = None,
    clinical_profile: Optional[dict] = None,
) -> Optional[dict]:
    """
    Update an existing patient record.

    Use this tool to update patient information, especially:
    - After extracting the patient's name from conversation
    - After updating clinical profile or onboarding state
    - After collecting additional information

    Args:
        phone: Patient phone number (to identify the patient)
        name: Updated full name (optional)
        email: Updated email (optional)
        birth_date: Updated birth date in YYYY-MM-DD format (optional)
        clinical_profile: Updated clinical profile data (optional)

    Returns:
        Updated patient data dictionary, or None if update failed.
    """
    repo = PatientRepository()

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
        # Nothing to update, just return current data
        return repo.get_by_phone(phone)

    return repo.create_or_update(phone, data)


@tool
def update_onboarding_state(
    phone: str,
    new_state: str,
    additional_data: Optional[dict] = None,
) -> Optional[dict]:
    """
    Update the onboarding state for a patient.

    Use this tool to track progress through the onboarding flow.
    Valid states:
    - "new": Initial state
    - "collecting_info": Gathering basic information
    - "scheduling_appointment": Ready to schedule first consultation
    - "completed": Onboarding finished

    Args:
        phone: Patient phone number
        new_state: New onboarding state
        additional_data: Additional data to merge into clinical_profile (optional)

    Returns:
        Updated patient data dictionary, or None if update failed.
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
    create_patient,
    update_patient,
    update_onboarding_state,
]

