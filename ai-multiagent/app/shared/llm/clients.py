"""LLM client factory with fallback support."""

from collections.abc import Sequence
from functools import lru_cache
from typing import Any, Literal

from langchain_core.language_models import BaseChatModel
from langchain_core.messages.base import BaseMessage
from langchain_core.prompt_values import PromptValue
from langchain_core.runnables.fallbacks import RunnableWithFallbacks
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field, SecretStr

from app.shared.config import get_settings

# Supported models
type AllowedModel = Literal[
    # OpenAI
    "gpt-5.1",
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4.1",
    "gpt-4.1-mini",
    # Gemini
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash-preview-04-17",
]

# Type for model with optional fallbacks
type Runnable = (
    RunnableWithFallbacks[
        PromptValue
        | str
        | Sequence[BaseMessage | list[str] | tuple[str, str] | str | dict[str, Any]],
        BaseMessage,
    ]
    | ChatOpenAI
    | ChatGoogleGenerativeAI
)

# Default configurations
DEFAULT_MODEL: AllowedModel = "gpt-5.1"
DEFAULT_FALLBACK_MODELS: list[AllowedModel] = ["gemini-2.0-flash"]
DEFAULT_TEMPERATURE: float = 0.7


class LLMModelConfiguration(BaseModel):
    """Configuration for LLM model with fallback support."""

    model: AllowedModel
    fallback_models: list[AllowedModel] = Field(default_factory=list)
    temperature: float = 0.0

    def get_model(self) -> Runnable:
        """Get configured model with fallbacks."""
        return get_model_with_fallbacks(
            model=self.model,
            fallback_models=self.fallback_models,
            temperature=self.temperature,
        )


@lru_cache
def get_model(
    model_name: AllowedModel,
    temperature: float,
) -> ChatOpenAI | ChatGoogleGenerativeAI:
    """
    Get a LangChain chat model instance.

    Args:
        model_name: Name of the model to use
        temperature: Temperature for generation

    Returns:
        A configured chat model instance
    """
    settings = get_settings()

    match model_name:
        case "gpt-5.1" | "gpt-4o" | "gpt-4o-mini" | "gpt-4.1" | "gpt-4.1-mini":
            return ChatOpenAI(
                model=model_name,
                temperature=temperature,
                api_key=SecretStr(settings.OPENAI_API_KEY),
                stream_usage=True,
            )
        case "gemini-2.0-flash" | "gemini-2.0-flash-lite" | "gemini-2.5-flash-preview-04-17":
            return ChatGoogleGenerativeAI(
                model=model_name,
                temperature=temperature,
                google_api_key=settings.GOOGLE_API_KEY,
            )
        case _:
            raise ValueError(f"Unknown model: {model_name}")


def get_model_with_fallbacks(
    model: AllowedModel,
    fallback_models: list[AllowedModel],
    temperature: float,
) -> Runnable:
    """
    Get a model with fallback support.

    Args:
        model: Primary model to use
        fallback_models: List of fallback models in order of preference
        temperature: Temperature for generation

    Returns:
        A model with fallbacks if specified, otherwise the primary model
    """
    selected_model = get_model(model, temperature)
    if fallback_models:
        selected_fallback_models = [
            get_model(fallback_model, temperature) for fallback_model in fallback_models
        ]
        return selected_model.with_fallbacks(selected_fallback_models)
    return selected_model


def get_chat_model(
    temperature: float = DEFAULT_TEMPERATURE,
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
    return get_model(model_name=model_name or DEFAULT_MODEL, temperature=temperature)


def get_chat_model_with_fallbacks(
    temperature: float = DEFAULT_TEMPERATURE,
    model_name: AllowedModel | None = None,
    fallback_models: list[AllowedModel] | None = None,
) -> Runnable:
    """
    Get a chat model with fallback support.

    Args:
        temperature: Temperature for generation
        model_name: Primary model (defaults to gpt-5.1)
        fallback_models: Fallback models (defaults to gemini-2.0-flash)

    Returns:
        A configured chat model with fallbacks
    """
    return get_model_with_fallbacks(
        model=model_name or DEFAULT_MODEL,
        fallback_models=fallback_models or DEFAULT_FALLBACK_MODELS,
        temperature=temperature,
    )
