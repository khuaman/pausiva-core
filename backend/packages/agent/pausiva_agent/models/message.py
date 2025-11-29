from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional


class MessageType(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


@dataclass
class Message:
    """Modelo de mensaje en la conversación."""
    content: str
    message_type: MessageType
    timestamp: datetime = field(default_factory=datetime.now)
    phone_number: Optional[str] = None
    metadata: dict = field(default_factory=dict)
    
    def to_dict(self) -> dict:
        return {
            "content": self.content,
            "message_type": self.message_type.value,
            "timestamp": self.timestamp.isoformat(),
            "phone_number": self.phone_number,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> "Message":
        return cls(
            content=data["content"],
            message_type=MessageType(data["message_type"]),
            timestamp=datetime.fromisoformat(data["timestamp"]) if data.get("timestamp") else datetime.now(),
            phone_number=data.get("phone_number"),
            metadata=data.get("metadata", {})
        )
    
    def to_gemini_format(self) -> dict:
        """Convierte el mensaje al formato esperado por Gemini."""
        role = "user" if self.message_type == MessageType.USER else "model"
        return {
            "role": role,
            "parts": [{"text": self.content}]
        }

