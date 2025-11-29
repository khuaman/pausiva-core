"""
Pausiva Agent - Sistema multiagente de acompañamiento.

Soporta almacenamiento en:
- Supabase (si está configurado)
- JSON local (fallback)
"""
from .agents import PausivaOrchestrator
from .models import (
    Patient,
    PatientProfile,
    Message,
    MessageType,
    Medication,
    MedicationSchedule,
    Appointment,
    AppointmentAction,
    AgentResponse,
    RiskLevel
)
from .memory import PatientContext, ConversationMemory, StorageManager

# Database integration (optional)
try:
    from .database import (
        SupabaseClient,
        get_supabase_client,
        SupabaseStorageManager,
        PatientRepository,
        FollowingRepository,
        AppointmentRepository
    )
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False

__version__ = "1.0.0"

__all__ = [
    # Main
    "PausivaOrchestrator",
    
    # Models
    "Patient",
    "PatientProfile",
    "Message",
    "MessageType",
    "Medication",
    "MedicationSchedule",
    "Appointment",
    "AppointmentAction",
    "AgentResponse",
    "RiskLevel",
    
    # Memory
    "PatientContext",
    "ConversationMemory",
    "StorageManager",
    
    # Database (if available)
    "SUPABASE_AVAILABLE",
]

# Add database exports if available
if SUPABASE_AVAILABLE:
    __all__.extend([
        "SupabaseClient",
        "get_supabase_client",
        "SupabaseStorageManager",
        "PatientRepository",
        "FollowingRepository",
        "AppointmentRepository"
    ])
