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
    current = Path(__file__).parent
    for _ in range(6):
        env_path = current / ".env"
        if env_path.exists():
            with open(env_path) as f:
                for line in f:
                    if "=" in line and not line.startswith("#"):
                        key, value = line.strip().split("=", 1)
                        os.environ.setdefault(key, value)
            return
        current = current.parent


load_env()


class BaseAgent(ABC):
    """
    Clase base para todos los agentes de Pausiva.
    Proporciona funcionalidad común para interactuar con Gemini.
    
    Con Supabase integrado, incluye contexto enriquecido de la paciente.
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
        """
        Construye el mensaje de contexto para el modelo.
        Incluye datos extendidos de Supabase si están disponibles.
        """
        # Get extended context if available
        context_data = context.get_extended_context()
        
        # Build a structured context message
        parts = ["[CONTEXTO DE LA PACIENTE]:"]
        
        # Patient basic info
        patient = context_data.get("patient", {})
        if patient:
            parts.append("\n== INFORMACIÓN DEL PACIENTE ==")
            if patient.get("name"):
                parts.append(f"Nombre: {patient['name']}")
            parts.append(f"Teléfono: {patient.get('phone', context.phone_number)}")
            
            # Profile summary
            if context.patient and hasattr(context.patient, 'get_profile_summary'):
                try:
                    profile_summary = context.patient.get_profile_summary()
                    if profile_summary and profile_summary != "Sin información de perfil":
                        parts.append(f"Perfil: {profile_summary}")
                except Exception:
                    pass
            
            # Clinical history from Supabase
            clinical = patient.get("clinical_history", {})
            if clinical:
                if clinical.get("medical_conditions"):
                    parts.append(f"Condiciones médicas: {', '.join(clinical['medical_conditions'])}")
                if clinical.get("allergies"):
                    parts.append(f"Alergias: {', '.join(clinical['allergies'])}")
                if clinical.get("menopause_stage"):
                    parts.append(f"Etapa menopausia: {clinical['menopause_stage']}")
            
            # Current risk
            if patient.get("current_risk_level") and patient["current_risk_level"] != "none":
                parts.append(f"Nivel de riesgo actual: {patient['current_risk_level']} (score: {patient.get('current_risk_score', 0)})")
        
        # Active medications
        medications = context_data.get("active_medications", [])
        if medications:
            parts.append("\n== MEDICACIÓN ACTIVA ==")
            for med in medications[:5]:  # Limit to 5
                if isinstance(med, dict):
                    med_name = med.get("name") or med.get("medicine_name", "Sin nombre")
                    freq = med.get("frequency_text", "")
                    parts.append(f"- {med_name}: {freq}")
        
        # Upcoming appointments
        appointments = context_data.get("upcoming_appointments", [])
        if appointments:
            parts.append("\n== CITAS PRÓXIMAS ==")
            for apt in appointments[:3]:  # Limit to 3
                if isinstance(apt, dict):
                    date = apt.get("date") or apt.get("scheduled_at", "")[:10]
                    time = apt.get("time", "")
                    doctor = apt.get("doctor_name") or apt.get("specialist_type", "")
                    parts.append(f"- {date} {time}: {doctor}")
        
        # Recent symptoms
        symptoms = context_data.get("recent_symptoms", [])
        if symptoms:
            parts.append("\n== SÍNTOMAS RECIENTES ==")
            for sym in symptoms[:5]:
                if isinstance(sym, dict):
                    summary = sym.get("summary", "")[:100]
                    risk = sym.get("risk_level", "none")
                    parts.append(f"- {summary} (riesgo: {risk})")
        
        # Recent interactions (from Supabase)
        interactions = context_data.get("interaction_history", [])
        if interactions:
            parts.append("\n== INTERACCIONES RECIENTES ==")
            for inter in interactions[:3]:
                if isinstance(inter, dict):
                    inter_type = inter.get("type", "")
                    summary = inter.get("summary", "")[:80]
                    parts.append(f"- [{inter_type}] {summary}")
        
        # Conversation summary
        conv_summary = context_data.get("conversation_summary", "")
        if conv_summary and conv_summary != "Sin conversaciones previas.":
            parts.append("\n== CONVERSACIÓN RECIENTE ==")
            parts.append(conv_summary[:500])
        
        return "\n".join(parts)
    
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
        Incluye contexto enriquecido de Supabase.
        """
        # Construir mensajes para el modelo
        messages = context.conversation.get_context_for_model()
        
        # Agregar contexto de la paciente (ahora con datos de Supabase)
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
