"""LLM client factory using LangChain."""

from functools import lru_cache
from typing import Literal

from langchain_core.language_models import BaseChatModel
from langchain_google_genai import ChatGoogleGenerativeAI

from app.shared.config import get_settings

# Supported models
type AllowedModel = Literal[
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
]


DEFAULT_MODEL: AllowedModel = "gemini-2.0-flash"
DEFAULT_TEMPERATURE: float = 0.7


@lru_cache
def get_model(
    model_name: AllowedModel | None = None,
    temperature: float | None = None,
) -> BaseChatModel:
    """
    Get a LangChain chat model instance.

    Args:
        model_name: Name of the model to use (defaults to gemini-2.0-flash)
        temperature: Temperature for generation (defaults to 0.7)

    Returns:
        A configured chat model instance
    """
    settings = get_settings()

    model = model_name or DEFAULT_MODEL
    temp = temperature if temperature is not None else DEFAULT_TEMPERATURE

    return ChatGoogleGenerativeAI(
        model=model,
        temperature=temp,
        google_api_key=settings.GOOGLE_API_KEY,
    )


def get_chat_model(
    temperature: float = 0.7,
    model_name: AllowedModel | None = None,
) -> BaseChatModel:
    """
    Get a chat model configured for conversational use.

    Args:
        temperature: Temperature for generation
        model_name: Optional model override

    Returns:
        A configured chat model instance
    """
    return get_model(model_name=model_name, temperature=temperature)


def get_router_model(
    temperature: float = 0.0,
    model_name: AllowedModel | None = None,
) -> BaseChatModel:
    """
    Get a model configured for routing decisions (lower temperature).

    Args:
        temperature: Temperature for generation (low for consistency)
        model_name: Optional model override

    Returns:
        A configured chat model instance
    """
    return get_model(model_name=model_name, temperature=temperature)


def get_extraction_model(
    temperature: float = 0.3,
    model_name: AllowedModel | None = None,
) -> BaseChatModel:
    """
    Get a model configured for data extraction.

    Args:
        temperature: Temperature for generation
        model_name: Optional model override

    Returns:
        A configured chat model instance
    """
    return get_model(model_name=model_name, temperature=temperature)
