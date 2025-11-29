from datetime import datetime
from typing import Optional

from ..models.message import Message, MessageType
from .storage import StorageManager


class ConversationMemory:
    """
    Gestiona la memoria de conversación para una paciente específica.
    Mantiene el contexto de la conversación con límite de ventana.
    """
    
    def __init__(
        self,
        phone_number: str,
        storage: StorageManager,
        max_messages: int = 20,  # Ventana de contexto
        max_tokens_estimate: int = 8000  # Estimación de tokens máximos
    ):
        self.phone_number = phone_number
        self.storage = storage
        self.max_messages = max_messages
        self.max_tokens_estimate = max_tokens_estimate
        self.messages: list[Message] = []
        self._load_history()
    
    def _load_history(self):
        """Carga el historial de conversación desde almacenamiento."""
        stored_messages = self.storage.load_conversation(self.phone_number)
        self.messages = [Message.from_dict(m) for m in stored_messages]
        self._trim_history()
    
    def _trim_history(self):
        """Recorta el historial para mantener la ventana de contexto."""
        if len(self.messages) > self.max_messages:
            # Mantener solo los últimos N mensajes
            self.messages = self.messages[-self.max_messages:]
    
    def _estimate_tokens(self, text: str) -> int:
        """Estimación simple de tokens (1 token ≈ 4 caracteres en español)."""
        return len(text) // 4
    
    def add_user_message(self, content: str) -> Message:
        """Agrega un mensaje de la paciente."""
        message = Message(
            content=content,
            message_type=MessageType.USER,
            phone_number=self.phone_number
        )
        self.messages.append(message)
        self._trim_history()
        self._save()
        return message
    
    def add_assistant_message(self, content: str, metadata: dict = None) -> Message:
        """Agrega una respuesta del asistente."""
        message = Message(
            content=content,
            message_type=MessageType.ASSISTANT,
            phone_number=self.phone_number,
            metadata=metadata or {}
        )
        self.messages.append(message)
        self._trim_history()
        self._save()
        return message
    
    def _save(self):
        """Guarda el historial en almacenamiento."""
        self.storage.save_conversation(
            self.phone_number,
            [m.to_dict() for m in self.messages]
        )
    
    def get_context_for_model(self) -> list[dict]:
        """
        Retorna el historial en formato para Gemini.
        Aplica ventana de contexto basada en tokens estimados.
        """
        result = []
        total_tokens = 0
        
        # Iterar desde el más reciente al más antiguo
        for message in reversed(self.messages):
            tokens = self._estimate_tokens(message.content)
            if total_tokens + tokens > self.max_tokens_estimate:
                break
            result.insert(0, message.to_gemini_format())
            total_tokens += tokens
        
        return result
    
    def get_recent_messages(self, count: int = 5) -> list[Message]:
        """Retorna los últimos N mensajes."""
        return self.messages[-count:]
    
    def get_summary(self) -> str:
        """Genera un resumen del contexto actual."""
        if not self.messages:
            return "Sin conversaciones previas."
        
        recent = self.get_recent_messages(3)
        summary_parts = []
        for msg in recent:
            role = "Paciente" if msg.message_type == MessageType.USER else "Asistente"
            content = msg.content[:100] + "..." if len(msg.content) > 100 else msg.content
            summary_parts.append(f"{role}: {content}")
        
        return "\n".join(summary_parts)
    
    def clear(self):
        """Limpia el historial de conversación."""
        self.messages = []
        self._save()
