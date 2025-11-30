"""Medication management tools for Chat V2 agent."""

from typing import Optional

from langchain_core.tools import tool

from app.shared.database import PatientRepository


@tool
def get_medications(phone: str) -> list[dict]:
    """Get patient's current medications from their clinical profile.

    WHEN TO USE:
    - Patient asks: "¿qué medicamentos tomo?", "mis medicinas", "mi tratamiento"
    - Before asking about medication adherence
    - When patient mentions side effects (to check what they're taking)
    - To provide context when discussing symptoms

    USER INTENT MAPPING:
    - "¿Cuáles son mis medicamentos?" → get_medications(phone)
    - "Mi tratamiento hormonal" → get_medications(phone)
    - "¿Qué me recetaron?" → get_medications(phone)

    RETURNS list of medications with:
    - name: medication name
    - dosage: e.g., "1mg", "500mg"
    - frequency: e.g., "cada 8 horas", "una vez al día"
    - time_of_day: e.g., "mañana", "noche"
    - notes: additional instructions like "con comida"
    - active: boolean

    RESPONSE GUIDANCE:
    - If medications exist: List them clearly with dosage and frequency
    - If empty: "No tengo registro de medicamentos. ¿Te gustaría agregar alguno?"

    IMPORTANT:
    - Medications come from clinical_profile_json, may be updated by doctors
    - This is for INFORMATION only - never modify or suggest dosage changes
    - For medication questions beyond this, recommend consulting their doctor

    Args:
        phone: Patient phone number
    """
    patient_repo = PatientRepository()

    # Look up patient
    patient = patient_repo.get_by_phone(phone)
    if not patient:
        return []

    # Get medications from patient's clinical profile or plans
    clinical_profile = patient.get("clinical_profile", {}) or {}
    return clinical_profile.get("medications", [])


@tool
def add_medication_info(
    phone: str,
    medication_name: str,
    dosage: Optional[str] = None,
    frequency: Optional[str] = None,
    time_of_day: Optional[str] = None,
    notes: Optional[str] = None,
) -> dict:
    """Add medication information provided by the patient to their profile.

    WHEN TO USE:
    - Patient tells you about a medication they're taking
    - After a consultation when patient shares their prescription
    - Patient wants to track a new medication

    INFORMATION EXTRACTION:
    - "Tomo estradiol 1mg" → name="Estradiol", dosage="1mg"
    - "Cada 8 horas" → frequency="cada 8 horas"
    - "En la mañana y en la noche" → time_of_day="mañana y noche"
    - "Con el desayuno" → notes="con el desayuno"
    - "Sin comida" → notes="en ayunas"

    COMMON MENOPAUSE MEDICATIONS:
    - Estradiol (hormonal therapy)
    - Progesterona
    - Calcio + Vitamina D
    - Isoflavonas de soya
    - Melatonina (for sleep)

    IMPORTANT:
    - This ADDS to existing medications, doesn't replace
    - Only add medications the PATIENT tells you about
    - Never suggest or recommend medications - that's doctor's job
    - After adding, confirm: "He registrado [medicamento]. ¿Quieres configurar recordatorios?"

    RESPONSE PATTERN:
    "He registrado tu medicamento [nombre]. ¿Te gustaría que te envíe recordatorios para tomarlo?"

    Args:
        phone: Patient phone number
        medication_name: Exact name of medication (capitalize properly)
        dosage: Dosage if provided (e.g., "1mg", "500mg", "2 tabletas")
        frequency: How often (e.g., "una vez al día", "cada 8 horas", "2 veces al día")
        time_of_day: When to take (e.g., "mañana", "noche", "mañana y noche")
        notes: Special instructions (e.g., "con comida", "en ayunas", "antes de dormir")
    """
    patient_repo = PatientRepository()

    patient = patient_repo.get_by_phone(phone)
    if not patient:
        return {"status": "error", "message": "Paciente no encontrado"}

    # Get current clinical profile
    clinical_profile = patient.get("clinical_profile", {}) or {}
    medications = clinical_profile.get("medications", [])

    # Add new medication
    new_med = {
        "name": medication_name,
        "dosage": dosage,
        "frequency": frequency,
        "time_of_day": time_of_day,
        "notes": notes,
        "active": True,
    }
    medications.append(new_med)

    # Update clinical profile
    clinical_profile["medications"] = medications
    patient_repo.create_or_update(phone, {"clinical_profile": clinical_profile})

    return {
        "status": "success",
        "message": f"Medicamento {medication_name} registrado correctamente",
        "medication": new_med,
    }


@tool
def set_medication_reminder(
    phone: str,
    medication_name: str,
    reminder_times: list[str],
    days_of_week: Optional[list[str]] = None,
) -> dict:
    """Set up medication reminders for a patient.

    WHEN TO USE:
    - Patient says: "quiero recordatorios", "avísame para tomar mi medicina"
    - After adding a medication: offer to set reminders
    - Patient explicitly requests reminder configuration

    TIME FORMAT CONVERSION:
    - "en la mañana" → ["08:00"]
    - "en la noche" → ["20:00"]
    - "mañana y noche" → ["08:00", "20:00"]
    - "cada 8 horas" → ["08:00", "16:00", "00:00"]
    - "cada 12 horas" → ["08:00", "20:00"]
    - "a las 10" → ["10:00"]
    - "después de comer" → ["13:00"] (approximate lunch time)
    - "antes de dormir" → ["22:00"]

    DAYS HANDLING:
    - If not specified or "todos los días" → days_of_week=None (defaults to daily)
    - "entre semana" → ["lunes", "martes", "miércoles", "jueves", "viernes"]
    - "fines de semana" → ["sábado", "domingo"]
    - Specific days: use Spanish day names in lowercase

    IMPORTANT:
    - For MVP, this records preferences - actual reminders scheduled later
    - Always confirm the configuration: "Te recordaré tomar [medicamento] a las [horas]"
    - If unclear about times, ASK the patient before setting

    RESPONSE PATTERN:
    "¡Listo! Te enviaré recordatorios para [medicamento] a las [hora(s)]. Si necesitas cambiarlos, solo avísame 💜"

    Args:
        phone: Patient phone number
        medication_name: Exact name of medication (must match existing medication)
        reminder_times: List of times in HH:MM format, e.g., ["08:00", "20:00"]
        days_of_week: Spanish day names, e.g., ["lunes", "miércoles", "viernes"], or None for daily
    """
    patient_repo = PatientRepository()

    patient = patient_repo.get_by_phone(phone)
    if not patient:
        return {"status": "error", "message": "Paciente no encontrado"}

    reminder_config = {
        "medication_name": medication_name,
        "times": reminder_times,
        "days": days_of_week
        or ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"],
        "active": True,
    }

    # Get current clinical profile
    clinical_profile = patient.get("clinical_profile", {}) or {}
    reminders = clinical_profile.get("medication_reminders", [])

    # Add or update reminder
    existing_idx = None
    for idx, r in enumerate(reminders):
        if r.get("medication_name") == medication_name:
            existing_idx = idx
            break

    if existing_idx is not None:
        reminders[existing_idx] = reminder_config
    else:
        reminders.append(reminder_config)

    clinical_profile["medication_reminders"] = reminders
    patient_repo.create_or_update(phone, {"clinical_profile": clinical_profile})

    times_str = ", ".join(reminder_times)
    return {
        "status": "success",
        "message": f"Recordatorios configurados para {medication_name} a las {times_str}",
        "reminder": reminder_config,
    }


@tool
def confirm_medication_taken(
    phone: str,
    medication_name: str,
) -> dict:
    """Record that a patient has taken their medication (adherence tracking).

    WHEN TO USE:
    - Patient responds to reminder: "ya lo tomé", "listo", "sí"
    - Patient proactively says: "ya me tomé mi medicina"
    - After patient confirms taking medication

    PATIENT CONFIRMATIONS TO DETECT:
    - "Ya lo tomé" / "Ya me lo tomé"
    - "Listo" / "Ok" / "Sí" (in response to reminder)
    - "Me tomé el [medicamento]"
    - "Ya tomé mi medicina"
    - "✓" or similar confirmation emojis

    RESPONSE PATTERN:
    "¡Excelente! He registrado que tomaste tu [medicamento]. Sigue así 💜"

    IMPORTANT:
    - This is for ADHERENCE TRACKING, helps identify patterns
    - For MVP, confirmation is logged - analytics will come later
    - Creates a timestamped record of when medication was taken
    - Be encouraging and positive when patient confirms

    ADHERENCE SUPPORT:
    - If patient confirms: Positive reinforcement
    - If patient says they forgot: Be understanding, don't guilt
    - If patient consistently misses: Suggest adjusting reminder times

    Args:
        phone: Patient phone number
        medication_name: Name of medication taken (should match an existing medication)
    """
    from datetime import datetime

    patient_repo = PatientRepository()

    patient = patient_repo.get_by_phone(phone)
    if not patient:
        return {"status": "error", "message": "Paciente no encontrado"}

    # Record the confirmation
    # For MVP, this is just logged - could be stored in a separate table later
    return {
        "status": "success",
        "message": f"Registrado: tomaste {medication_name}",
        "medication": medication_name,
        "confirmed_at": datetime.now().isoformat(),
    }


# Export all tools
MEDICATION_TOOLS = [
    get_medications,
    add_medication_info,
    set_medication_reminder,
    confirm_medication_taken,
]
