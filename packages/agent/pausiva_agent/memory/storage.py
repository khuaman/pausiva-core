"""
Storage manager for Pausiva Agent.
Supports both Supabase and local JSON storage.
Automatically uses Supabase if configured, otherwise falls back to JSON.
"""
import json
import os
from datetime import datetime
from typing import Optional
from pathlib import Path


class StorageManager:
    """
    Gestiona el almacenamiento persistente de datos de pacientes.
    
    Prioridad de almacenamiento:
    1. Supabase (si está configurado y disponible)
    2. JSON local (fallback)
    """
    
    def __init__(self, storage_path: str = None, use_supabase: bool = True):
        """
        Initialize storage manager.
        
        Args:
            storage_path: Path for JSON storage (fallback)
            use_supabase: Whether to try using Supabase
        """
        self._supabase_storage = None
        self._use_supabase = use_supabase
        
        # Try to initialize Supabase storage
        if use_supabase:
            self._init_supabase()
        
        # Setup JSON fallback path
        if storage_path is None:
            storage_path = self._find_data_path()
        
        self.storage_path = Path(storage_path)
        self._ensure_directories()
    
    def _init_supabase(self):
        """Initialize Supabase storage if available."""
        try:
            from ..database import SupabaseStorageManager
            self._supabase_storage = SupabaseStorageManager()
            if not self._supabase_storage.is_available():
                self._supabase_storage = None
        except ImportError:
            self._supabase_storage = None
        except Exception as e:
            print(f"Warning: Could not initialize Supabase storage: {e}")
            self._supabase_storage = None
    
    def _find_data_path(self) -> Path:
        """Find data directory in monorepo."""
        current = Path(__file__).parent
        for _ in range(6):
            potential_data = current / "data"
            if potential_data.exists():
                return potential_data
            current = current.parent
        
        # Default to monorepo root
        monorepo_root = Path(__file__).parent.parent.parent.parent.parent
        return monorepo_root / "data"
    
    def _ensure_directories(self):
        """Crea los directorios necesarios para JSON storage."""
        directories = [
            self.storage_path,
            self.storage_path / "patients",
            self.storage_path / "conversations",
            self.storage_path / "medications",
            self.storage_path / "appointments",
            self.storage_path / "symptoms"
        ]
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
    
    def _sanitize_phone(self, phone_number: str) -> str:
        """Sanitiza el número de teléfono para usarlo como nombre de archivo."""
        return phone_number.replace("+", "").replace(" ", "").replace("-", "")
    
    @property
    def using_supabase(self) -> bool:
        """Check if currently using Supabase."""
        return self._supabase_storage is not None
    
    # =========================================
    # PACIENTES
    # =========================================
    
    def save_patient(self, phone_number: str, data: dict):
        """Guarda los datos de una paciente."""
        if self._supabase_storage:
            self._supabase_storage.save_patient(phone_number, data)
            return
        
        # JSON fallback
        filename = self.storage_path / "patients" / f"{self._sanitize_phone(phone_number)}.json"
        data["updated_at"] = datetime.now().isoformat()
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def load_patient(self, phone_number: str) -> Optional[dict]:
        """Carga los datos de una paciente."""
        if self._supabase_storage:
            return self._supabase_storage.load_patient(phone_number)
        
        # JSON fallback
        filename = self.storage_path / "patients" / f"{self._sanitize_phone(phone_number)}.json"
        if filename.exists():
            with open(filename, "r", encoding="utf-8") as f:
                return json.load(f)
        return None
    
    def patient_exists(self, phone_number: str) -> bool:
        """Verifica si existe una paciente."""
        if self._supabase_storage:
            return self._supabase_storage.patient_exists(phone_number)
        
        filename = self.storage_path / "patients" / f"{self._sanitize_phone(phone_number)}.json"
        return filename.exists()
    
    # =========================================
    # CONVERSACIONES
    # =========================================
    
    def save_conversation(self, phone_number: str, messages: list[dict]):
        """Guarda el historial de conversación de una paciente."""
        if self._supabase_storage:
            self._supabase_storage.save_conversation(phone_number, messages)
            # Also save locally for full transcript
        
        # Always save JSON for full conversation history
        filename = self.storage_path / "conversations" / f"{self._sanitize_phone(phone_number)}.json"
        data = {
            "phone_number": phone_number,
            "messages": messages,
            "updated_at": datetime.now().isoformat()
        }
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def load_conversation(self, phone_number: str) -> list[dict]:
        """Carga el historial de conversación de una paciente."""
        # Always load from JSON (Supabase stores summaries only)
        filename = self.storage_path / "conversations" / f"{self._sanitize_phone(phone_number)}.json"
        if filename.exists():
            with open(filename, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("messages", [])
        return []
    
    def append_message(self, phone_number: str, message: dict):
        """Agrega un mensaje al historial de conversación."""
        messages = self.load_conversation(phone_number)
        messages.append(message)
        self.save_conversation(phone_number, messages)
    
    # =========================================
    # MEDICACIÓN
    # =========================================
    
    def save_medications(self, phone_number: str, medications: list[dict]):
        """Guarda la medicación de una paciente."""
        if self._supabase_storage:
            self._supabase_storage.save_medications(phone_number, medications)
            return
        
        filename = self.storage_path / "medications" / f"{self._sanitize_phone(phone_number)}.json"
        data = {
            "phone_number": phone_number,
            "medications": medications,
            "updated_at": datetime.now().isoformat()
        }
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def load_medications(self, phone_number: str) -> list[dict]:
        """Carga la medicación de una paciente."""
        if self._supabase_storage:
            return self._supabase_storage.load_medications(phone_number)
        
        filename = self.storage_path / "medications" / f"{self._sanitize_phone(phone_number)}.json"
        if filename.exists():
            with open(filename, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("medications", [])
        return []
    
    # =========================================
    # CITAS
    # =========================================
    
    def save_appointments(self, phone_number: str, appointments: list[dict]):
        """Guarda las citas de una paciente."""
        if self._supabase_storage:
            self._supabase_storage.save_appointments(phone_number, appointments)
            return
        
        filename = self.storage_path / "appointments" / f"{self._sanitize_phone(phone_number)}.json"
        data = {
            "phone_number": phone_number,
            "appointments": appointments,
            "updated_at": datetime.now().isoformat()
        }
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def load_appointments(self, phone_number: str) -> list[dict]:
        """Carga las citas de una paciente."""
        if self._supabase_storage:
            return self._supabase_storage.load_appointments(phone_number)
        
        filename = self.storage_path / "appointments" / f"{self._sanitize_phone(phone_number)}.json"
        if filename.exists():
            with open(filename, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("appointments", [])
        return []
    
    # =========================================
    # SÍNTOMAS
    # =========================================
    
    def save_symptom_entry(self, phone_number: str, entry: dict):
        """Guarda una entrada de síntomas."""
        if self._supabase_storage:
            self._supabase_storage.save_symptom_entry(phone_number, entry)
            # Also save locally
        
        # Always save to JSON for history
        filename = self.storage_path / "symptoms" / f"{self._sanitize_phone(phone_number)}.json"
        
        entries = []
        if filename.exists():
            with open(filename, "r", encoding="utf-8") as f:
                data = json.load(f)
                entries = data.get("entries", [])
        
        entry["timestamp"] = datetime.now().isoformat()
        entries.append(entry)
        
        data = {
            "phone_number": phone_number,
            "entries": entries,
            "updated_at": datetime.now().isoformat()
        }
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def load_symptom_history(self, phone_number: str, limit: int = 30) -> list[dict]:
        """Carga el historial de síntomas de una paciente."""
        # Try Supabase first for richer data
        if self._supabase_storage:
            symptoms = self._supabase_storage.load_symptom_history(phone_number, limit)
            if symptoms:
                return symptoms
        
        # Fallback to JSON
        filename = self.storage_path / "symptoms" / f"{self._sanitize_phone(phone_number)}.json"
        if filename.exists():
            with open(filename, "r", encoding="utf-8") as f:
                data = json.load(f)
                entries = data.get("entries", [])
                return entries[-limit:]
        return []
    
    # =========================================
    # RISK TRACKING
    # =========================================
    
    def update_patient_risk(self, phone_number: str, risk_level: str, risk_score: int):
        """Update patient's current risk level."""
        if self._supabase_storage:
            self._supabase_storage.update_patient_risk(phone_number, risk_level, risk_score)
        
        # Also update in local patient file
        patient_data = self.load_patient(phone_number) or {}
        patient_data["current_risk_level"] = risk_level
        patient_data["current_risk_score"] = risk_score
        patient_data["risk_updated_at"] = datetime.now().isoformat()
        self.save_patient(phone_number, patient_data)
    
    # =========================================
    # EXTENDED DATA (Supabase only)
    # =========================================
    
    def get_patient_context_data(self, phone_number: str) -> dict:
        """
        Get comprehensive patient data for agent context.
        Only available with Supabase.
        """
        if self._supabase_storage:
            return self._supabase_storage.get_patient_context_data(phone_number)
        
        # Fallback: build from local files
        patient = self.load_patient(phone_number)
        medications = self.load_medications(phone_number)
        appointments = self.load_appointments(phone_number)
        symptoms = self.load_symptom_history(phone_number, limit=5)
        
        return {
            "patient": patient,
            "upcoming_appointments": appointments,
            "recent_symptoms": symptoms,
            "active_medications": medications,
            "recent_interactions": []
        }
