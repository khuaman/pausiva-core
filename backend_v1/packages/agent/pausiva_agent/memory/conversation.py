from datetime import datetime
from typing import Optional
from enum import Enum

from ..models.message import Message, MessageType
from .storage import StorageManager


class ConversationTopic(str, Enum):
    """Temas activos de conversación."""
    NONE = "none"
    GREETING = "greeting"
    SYMPTOMS = "symptoms"
    MEDICATION = "medication"
    APPOINTMENTS = "appointments"
    CHECKIN = "checkin"
    EMERGENCY = "emergency"
    GENERAL = "general"


class ConversationState:
    """
    Estado actual de la conversación.
    Permite mantener contexto entre mensajes.
    """
    
    def __init__(self):
        self.active_topic: ConversationTopic = ConversationTopic.NONE
        self.pending_question: Optional[str] = None  # Pregunta sin responder
        self.pending_action: Optional[str] = None    # Acción pendiente
        self.last_agent: Optional[str] = None        # Último agente que respondió
        self.turns_on_topic: int = 0                 # Turnos en el tema actual
        self.awaiting_response: bool = False         # Esperando respuesta específica
        self.context_data: dict = {}                 # Datos adicionales del contexto
    
    def set_topic(self, topic: ConversationTopic, agent: str = None):
        """Cambia el tema activo de conversación."""
        if self.active_topic != topic:
            self.active_topic = topic
            self.turns_on_topic = 0
        else:
            self.turns_on_topic += 1
        
        if agent:
            self.last_agent = agent
    
    def set_pending_question(self, question: str, action: str = None):
        """Marca que hay una pregunta pendiente de responder."""
        self.pending_question = question
        self.pending_action = action
        self.awaiting_response = True
    
    def clear_pending(self):
        """Limpia la pregunta/acción pendiente."""
        self.pending_question = None
        self.pending_action = None
        self.awaiting_response = False
    
    def to_dict(self) -> dict:
        return {
            "active_topic": self.active_topic.value,
            "pending_question": self.pending_question,
            "pending_action": self.pending_action,
            "last_agent": self.last_agent,
            "turns_on_topic": self.turns_on_topic,
            "awaiting_response": self.awaiting_response,
            "context_data": self.context_data
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "ConversationState":
        state = cls()
        state.active_topic = ConversationTopic(data.get("active_topic", "none"))
        state.pending_question = data.get("pending_question")
        state.pending_action = data.get("pending_action")
        state.last_agent = data.get("last_agent")
        state.turns_on_topic = data.get("turns_on_topic", 0)
        state.awaiting_response = data.get("awaiting_response", False)
        state.context_data = data.get("context_data", {})
        return state


class ConversationMemory:
    """
    Gestiona la memoria de conversación para una paciente específica.
    Mantiene el contexto de la conversación con límite de ventana.
    Incluye estado de conversación para flujo continuo.
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
        self.state = ConversationState()  # Estado de conversación
        self._load_history()
    
    def _load_history(self):
        """Carga el historial de conversación desde almacenamiento."""
        stored_messages = self.storage.load_conversation(self.phone_number)
        self.messages = [Message.from_dict(m) for m in stored_messages]
        self._trim_history()
        
        # Intentar recuperar estado del último mensaje del asistente
        for msg in reversed(self.messages):
            if msg.message_type == MessageType.ASSISTANT and msg.metadata:
                if "conversation_state" in msg.metadata:
                    self.state = ConversationState.from_dict(msg.metadata["conversation_state"])
                    break
    
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
        # Incluir estado de conversación en metadata
        full_metadata = metadata or {}
        full_metadata["conversation_state"] = self.state.to_dict()
        
        message = Message(
            content=content,
            message_type=MessageType.ASSISTANT,
            phone_number=self.phone_number,
            metadata=full_metadata
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
        self.state = ConversationState()
        self._save()
    
    def get_conversation_context(self) -> str:
        """
        Genera contexto de conversación para los agentes.
        Incluye el tema activo y estado actual.
        """
        parts = []
        
        if self.state.active_topic != ConversationTopic.NONE:
            parts.append(f"TEMA ACTIVO: {self.state.active_topic.value}")
        
        if self.state.last_agent:
            parts.append(f"ÚLTIMO AGENTE: {self.state.last_agent}")
        
        if self.state.pending_question:
            parts.append(f"PREGUNTA PENDIENTE: {self.state.pending_question}")
        
        if self.state.awaiting_response:
            parts.append("ESPERANDO RESPUESTA DE LA PACIENTE")
        
        if self.state.turns_on_topic > 0:
            parts.append(f"TURNOS EN ESTE TEMA: {self.state.turns_on_topic}")
        
        return "\n".join(parts) if parts else "Nueva conversación o tema."
    
    def is_continuation(self) -> bool:
        """Verifica si el próximo mensaje es continuación del tema actual."""
        return self.state.active_topic != ConversationTopic.NONE and self.state.turns_on_topic > 0
    
    def should_follow_up(self) -> bool:
        """Verifica si hay una pregunta pendiente de seguimiento."""
        return self.state.awaiting_response and self.state.pending_question is not None
