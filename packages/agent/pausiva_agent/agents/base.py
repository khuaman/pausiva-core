"""
Agente base para todos los agentes de Pausiva.
"""
import os
import json
from pathlib import Path
from abc import ABC, abstractmethod
from typing import Optional

from google import genai
from google.genai import types

from ..models.response import AgentResponse
from ..models.patient import RiskLevel
from ..memory.patient_context import PatientContext


def load_env():
    """Carga variables de entorno desde .env en la raíz del monorepo."""
    # Buscar .env en varios niveles hacia arriba
    current = Path(__file__).parent
    for _ in range(6):  # Buscar hasta 6 niveles arriba
        env_path = current / ".env"
        if env_path.exists():
            with open(env_path) as f:
                for line in f:
                    if "=" in line and not line.startswith("#"):
                        key, value = line.strip().split("=", 1)
                        os.environ[key] = value
            return
        current = current.parent


load_env()


class BaseAgent(ABC):
    """
    Clase base para todos los agentes de Pausiva.
    Proporciona funcionalidad común para interactuar con Gemini.
    """
    
    def __init__(
        self,
        name: str,
        system_prompt: str,
        model: str = "gemini-2.5-flash",
        temperature: float = 0.7
    ):
        self.name = name
        self.system_prompt = system_prompt
        self.model = model
        self.temperature = temperature
        self.client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))
    
    def _build_context_message(self, context: PatientContext) -> str:
        """Construye el mensaje de contexto para el modelo."""
        context_data = context.get_context_summary()
        return f"[CONTEXTO DE LA PACIENTE]:\n{json.dumps(context_data, ensure_ascii=False, indent=2)}"
    
    def _parse_response(self, response_text: str) -> AgentResponse:
        """Parsea la respuesta del modelo a AgentResponse."""
        try:
            data = json.loads(response_text)
            response = AgentResponse.from_dict(data)
            response.agent_used = self.name
            return response
        except json.JSONDecodeError:
            return AgentResponse.error_response()
    
    def _call_model(
        self,
        messages: list[dict],
        system_instruction: str = None
    ) -> str:
        """Llama al modelo de Gemini."""
        response = self.client.models.generate_content(
            model=self.model,
            contents=messages,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction or self.system_prompt,
                temperature=self.temperature,
                response_mime_type="application/json"
            )
        )
        return response.text
    
    @abstractmethod
    def process(
        self,
        message: str,
        context: PatientContext
    ) -> AgentResponse:
        """
        Procesa un mensaje de la paciente.
        Debe ser implementado por cada agente especializado.
        """
        pass
    
    def _default_process(
        self,
        message: str,
        context: PatientContext,
        additional_prompt: str = ""
    ) -> AgentResponse:
        """
        Procesamiento por defecto que pueden usar los agentes.
        """
        # Construir mensajes para el modelo
        messages = context.conversation.get_context_for_model()
        
        # Agregar contexto de la paciente
        context_message = self._build_context_message(context)
        
        # Agregar el mensaje actual con contexto
        full_message = f"{context_message}\n\n{additional_prompt}\n\n[MENSAJE DE LA PACIENTE]: {message}"
        messages.append({
            "role": "user",
            "parts": [{"text": full_message}]
        })
        
        # Llamar al modelo
        response_text = self._call_model(messages)
        
        # Parsear respuesta
        response = self._parse_response(response_text)
        
        # Actualizar contexto de la paciente
        self._update_context(context, message, response)
        
        return response
    
    def _update_context(
        self,
        context: PatientContext,
        user_message: str,
        response: AgentResponse
    ):
        """Actualiza el contexto de la paciente después de procesar."""
        # Agregar mensajes a la conversación
        context.conversation.add_user_message(user_message)
        context.conversation.add_assistant_message(
            response.reply_text,
            metadata={"agent": self.name, "risk_level": response.risk_level.value}
        )
        
        # Actualizar riesgo si cambió
        if response.risk_level != RiskLevel.NONE:
            context.update_risk(response.risk_level, response.risk_score)
        
        # Registrar síntomas si hay resumen
        if response.symptom_summary:
            context.add_symptom_entry(
                response.symptom_summary,
                response.risk_level.value,
                response.risk_score
            )
