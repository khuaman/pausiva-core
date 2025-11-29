import json
import os
from datetime import datetime
from typing import Optional
from pathlib import Path


class StorageManager:
    """
    Gestiona el almacenamiento persistente de datos de pacientes.
    Usa archivos JSON para simplicidad, pero puede extenderse a base de datos.
    """
    
    def __init__(self, storage_path: str = None):
        if storage_path is None:
            # Por defecto, buscar data/ en la raíz del monorepo
            current = Path(__file__).parent
            for _ in range(6):  # Buscar hasta 6 niveles arriba
                potential_data = current / "data"
                if potential_data.exists():
                    storage_path = potential_data
                    break
                current = current.parent
            
            # Si no existe, crear en la raíz del monorepo
            if storage_path is None:
                monorepo_root = Path(__file__).parent.parent.parent.parent.parent
                storage_path = monorepo_root / "data"
        
        self.storage_path = Path(storage_path)
        self._ensure_directories()
    
    def _ensure_directories(self):
        """Crea los directorios necesarios si no existen."""
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
    
    # === PACIENTES ===
    
    def save_patient(self, phone_number: str, data: dict):
        """Guarda los datos de una paciente."""
        filename = self.storage_path / "patients" / f"{self._sanitize_phone(phone_number)}.json"
        data["updated_at"] = datetime.now().isoformat()
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def load_patient(self, phone_number: str) -> Optional[dict]:
        """Carga los datos de una paciente."""
        filename = self.storage_path / "patients" / f"{self._sanitize_phone(phone_number)}.json"
        if filename.exists():
            with open(filename, "r", encoding="utf-8") as f:
                return json.load(f)
        return None
    
    def patient_exists(self, phone_number: str) -> bool:
        """Verifica si existe una paciente."""
        filename = self.storage_path / "patients" / f"{self._sanitize_phone(phone_number)}.json"
        return filename.exists()
    
    # === CONVERSACIONES ===
    
    def save_conversation(self, phone_number: str, messages: list[dict]):
        """Guarda el historial de conversación de una paciente."""
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
    
    # === MEDICACIÓN ===
    
    def save_medications(self, phone_number: str, medications: list[dict]):
        """Guarda la medicación de una paciente."""
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
        filename = self.storage_path / "medications" / f"{self._sanitize_phone(phone_number)}.json"
        if filename.exists():
            with open(filename, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("medications", [])
        return []
    
    # === CITAS ===
    
    def save_appointments(self, phone_number: str, appointments: list[dict]):
        """Guarda las citas de una paciente."""
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
        filename = self.storage_path / "appointments" / f"{self._sanitize_phone(phone_number)}.json"
        if filename.exists():
            with open(filename, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("appointments", [])
        return []
    
    # === SÍNTOMAS ===
    
    def save_symptom_entry(self, phone_number: str, entry: dict):
        """Guarda una entrada de síntomas."""
        filename = self.storage_path / "symptoms" / f"{self._sanitize_phone(phone_number)}.json"
        
        # Cargar entradas existentes
        entries = []
        if filename.exists():
            with open(filename, "r", encoding="utf-8") as f:
                data = json.load(f)
                entries = data.get("entries", [])
        
        # Agregar nueva entrada
        entry["timestamp"] = datetime.now().isoformat()
        entries.append(entry)
        
        # Guardar
        data = {
            "phone_number": phone_number,
            "entries": entries,
            "updated_at": datetime.now().isoformat()
        }
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def load_symptom_history(self, phone_number: str, limit: int = 30) -> list[dict]:
        """Carga el historial de síntomas de una paciente."""
        filename = self.storage_path / "symptoms" / f"{self._sanitize_phone(phone_number)}.json"
        if filename.exists():
            with open(filename, "r", encoding="utf-8") as f:
                data = json.load(f)
                entries = data.get("entries", [])
                return entries[-limit:]  # Últimas N entradas
        return []
