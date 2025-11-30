"""Message models."""

from datetime import datetime
from enum import Enum
from typing import ClassVar, Optional

from pydantic import Field

from .base import TableModel


class MessageType(str, Enum):
    """Type of message in conversation."""

    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Message(TableModel):
    """Message model for conversations."""

    __tablename__: ClassVar[str] = "messages"

    content: str
    message_type: MessageType
    timestamp: datetime = Field(default_factory=datetime.now)
    phone_number: Optional[str] = None
    metadata: dict = Field(default_factory=dict)

    def to_gemini_format(self) -> dict:
        """Convert to Gemini API format."""
        role = "user" if self.message_type == MessageType.USER else "model"
        return {"role": role, "parts": [{"text": self.content}]}

    def to_langchain_format(self) -> tuple[str, str]:
        """Convert to LangChain message format (role, content)."""
        if self.message_type == MessageType.USER:
            return ("human", self.content)
        elif self.message_type == MessageType.ASSISTANT:
            return ("ai", self.content)
        else:
            return ("system", self.content)
