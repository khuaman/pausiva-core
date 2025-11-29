"""
Orquestador Principal - Coordina todos los agentes de Pausiva.
"""
from enum import Enum

from .base import BaseAgent
from .triage import TriageAgent
from .medication import MedicationAgent
from .appointments import AppointmentsAgent
from .checkin import CheckinAgent
from .prompts import BASE_SYSTEM_PROMPT, ORCHESTRATOR_PROMPT, ResponseTemplates
from ..models.response import AgentResponse
from ..models.patient import RiskLevel
from ..memory.patient_context import PatientContext
from ..memory.storage import StorageManager


class MessageCategory(str, Enum):
    """Categorías de mensajes para routing."""
    TRIAGE = "triage"
    MEDICATION = "medication"
    APPOINTMENTS = "appointments"
    CHECKIN = "checkin"
    GENERAL = "general"
    GREETING = "greeting"


class PausivaOrchestrator:
    """
    Orquestador principal de Pausiva.
    Recibe mensajes, determina qué agente debe responder,
    y coordina la respuesta.
    """
    
    def __init__(self, storage_path: str = None):
        self.storage = StorageManager(storage_path)
        
        # Inicializar agentes especializados
        self.triage_agent = TriageAgent()
        self.medication_agent = MedicationAgent()
        self.appointments_agent = AppointmentsAgent()
        self.checkin_agent = CheckinAgent()
        
        # Agente general para mensajes que no encajan en categorías específicas
        self.general_agent = BaseGeneralAgent()
        
        # Cache de contextos de pacientes activos
        self._patient_contexts: dict[str, PatientContext] = {}
    
    def get_patient_context(self, phone_number: str) -> PatientContext:
        """
        Obtiene o crea el contexto de una paciente.
        """
        if phone_number not in self._patient_contexts:
            self._patient_contexts[phone_number] = PatientContext(
                phone_number,
                self.storage
            )
        return self._patient_contexts[phone_number]
    
    def process_message(
        self,
        phone_number: str,
        message: str
    ) -> AgentResponse:
        """
        Punto de entrada principal.
        Procesa un mensaje de WhatsApp de una paciente.
        
        Args:
            phone_number: Número de teléfono de la paciente
            message: Contenido del mensaje
        
        Returns:
            AgentResponse con la respuesta estructurada
        """
        # Obtener contexto de la paciente
        context = self.get_patient_context(phone_number)
        
        # Verificar si es paciente nueva
        if context.is_new_patient():
            return self._handle_new_patient(context, message)
        
        # Clasificar el mensaje
        category = self._classify_message(message, context)
        
        # Evaluación rápida de riesgo
        risk_level, risk_score = self.triage_agent.quick_assess(message)
        
        # Si es alto riesgo, priorizar triaje
        if risk_level == "high":
            return self.triage_agent.process(message, context)
        
        # Routing a agente especializado
        response = self._route_to_agent(category, message, context)
        
        # Si el agente no detectó riesgo pero el quick_assess sí, actualizar
        if response.risk_level == RiskLevel.NONE and risk_level != "none":
            response.risk_level = RiskLevel(risk_level)
            response.risk_score = max(response.risk_score, risk_score)
        
        return response
    
    def _handle_new_patient(
        self,
        context: PatientContext,
        message: str
    ) -> AgentResponse:
        """
        Maneja el primer mensaje de una paciente nueva.
        """
        # Guardar el mensaje inicial
        context.conversation.add_user_message(message)
        
        # Respuesta de bienvenida
        welcome_text = ResponseTemplates.WELCOME_NEW
        
        context.conversation.add_assistant_message(
            welcome_text,
            metadata={"agent": "orchestrator", "type": "welcome"}
        )
        
        return AgentResponse(
            reply_text=welcome_text,
            actions=["SEND_MESSAGE"],
            risk_level=RiskLevel.NONE,
            risk_score=0,
            agent_used="orchestrator"
        )
    
    def _classify_message(
        self,
        message: str,
        context: PatientContext
    ) -> MessageCategory:
        """
        Clasifica el mensaje para determinar qué agente debe responder.
        """
        message_lower = message.lower().strip()
        
        # Saludos simples
        greetings = ["hola", "buenos días", "buenas tardes", "buenas noches", "hi", "hello"]
        if message_lower in greetings or any(message_lower.startswith(g) for g in greetings):
            return MessageCategory.GREETING
        
        # Verificar palabras clave de cada categoría
        if self.medication_agent.has_medication_keywords(message):
            return MessageCategory.MEDICATION
        
        if self.appointments_agent.has_appointment_keywords(message):
            return MessageCategory.APPOINTMENTS
        
        # Verificar si parece respuesta a check-in
        if self.checkin_agent.is_checkin_response(message):
            return MessageCategory.CHECKIN
        
        # Verificar síntomas (triaje)
        risk_level, _ = self.triage_agent.quick_assess(message)
        if risk_level in ["high", "medium", "low"]:
            return MessageCategory.TRIAGE
        
        # Por defecto, tratar como check-in o general
        return MessageCategory.GENERAL
    
    def _route_to_agent(
        self,
        category: MessageCategory,
        message: str,
        context: PatientContext
    ) -> AgentResponse:
        """
        Dirige el mensaje al agente apropiado.
        """
        if category == MessageCategory.TRIAGE:
            return self.triage_agent.process(message, context)
        
        elif category == MessageCategory.MEDICATION:
            return self.medication_agent.process(message, context)
        
        elif category == MessageCategory.APPOINTMENTS:
            return self.appointments_agent.process(message, context)
        
        elif category == MessageCategory.CHECKIN:
            return self.checkin_agent.process(message, context)
        
        elif category == MessageCategory.GREETING:
            return self._handle_greeting(context)
        
        else:
            # General: usar check-in como fallback
            return self.general_agent.process(message, context)
    
    def _handle_greeting(self, context: PatientContext) -> AgentResponse:
        """
        Maneja saludos de pacientes existentes.
        """
        welcome_text = ResponseTemplates.WELCOME_RETURNING
        
        context.conversation.add_assistant_message(
            welcome_text,
            metadata={"agent": "orchestrator", "type": "greeting"}
        )
        
        return AgentResponse(
            reply_text=welcome_text,
            actions=["SEND_MESSAGE"],
            risk_level=RiskLevel.NONE,
            risk_score=0,
            agent_used="orchestrator"
        )
    
    def send_checkin(self, phone_number: str) -> AgentResponse:
        """
        Genera un mensaje de check-in proactivo para enviar a la paciente.
        Útil para cron jobs de seguimiento diario.
        """
        context = self.get_patient_context(phone_number)
        checkin_message = self.checkin_agent.generate_checkin_prompt(context)
        
        context.conversation.add_assistant_message(
            checkin_message,
            metadata={"agent": "checkin", "type": "proactive_checkin"}
        )
        
        return AgentResponse(
            reply_text=checkin_message,
            actions=["SEND_MESSAGE"],
            risk_level=RiskLevel.NONE,
            risk_score=0,
            agent_used="checkin"
        )


class BaseGeneralAgent(BaseAgent):
    """
    Agente general para mensajes que no encajan en categorías específicas.
    """
    
    def __init__(self):
        super().__init__(
            name="general",
            system_prompt=f"{BASE_SYSTEM_PROMPT}\n\n{ORCHESTRATOR_PROMPT}",
            temperature=0.7
        )
    
    def process(
        self,
        message: str,
        context: PatientContext
    ) -> AgentResponse:
        """
        Procesa mensajes generales.
        """
        additional_prompt = """
Este mensaje no encaja claramente en medicación, citas o síntomas específicos.
Responde de forma empática y ofrece ayuda.
Si la paciente parece confundida, explica brevemente lo que puedes hacer por ella.
Siempre incluye UPDATE_SYMPTOM_TRACKING en actions si menciona cómo se siente.
"""
        return self._default_process(message, context, additional_prompt)
