"""
Orquestador Principal - Coordina todos los agentes de Pausiva.
Sistema conversacional con flujo continuo y routing inteligente.
"""
from enum import Enum
from typing import Optional

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
from ..memory.conversation import ConversationTopic


class MessageCategory(str, Enum):
    """Categorías de mensajes para routing."""
    TRIAGE = "triage"
    MEDICATION = "medication"
    APPOINTMENTS = "appointments"
    CHECKIN = "checkin"
    GENERAL = "general"
    GREETING = "greeting"
    CONTINUATION = "continuation"  # Continuación del tema actual


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
        Mantiene flujo conversacional continuo.
        
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
        
        # Verificar si es continuación de conversación
        is_continuation = context.conversation.is_continuation()
        current_topic = context.conversation.state.active_topic
        
        # Evaluación rápida de riesgo (siempre)
        risk_level, risk_score = self.triage_agent.quick_assess(message)
        
        # Si es alto riesgo, SIEMPRE priorizar triaje
        if risk_level == "high":
            self._update_conversation_state(context, ConversationTopic.EMERGENCY, "triage")
            return self.triage_agent.process(message, context)
        
        # Clasificar el mensaje considerando contexto
        category = self._classify_message_with_context(message, context, is_continuation, current_topic)
        
        # Routing a agente especializado
        response = self._route_to_agent(category, message, context)
        
        # Actualizar estado de conversación
        self._update_conversation_after_response(context, category, response)
        
        # Si el agente no detectó riesgo pero el quick_assess sí, actualizar
        if response.risk_level == RiskLevel.NONE and risk_level != "none":
            response.risk_level = RiskLevel(risk_level)
            response.risk_score = max(response.risk_score, risk_score)
        
        return response
    
    def _classify_message_with_context(
        self,
        message: str,
        context: PatientContext,
        is_continuation: bool,
        current_topic: ConversationTopic
    ) -> MessageCategory:
        """
        Clasifica el mensaje considerando el contexto de conversación.
        """
        # Primero, verificar si hay pregunta pendiente
        if context.conversation.should_follow_up():
            # Verificar si la respuesta parece ser para la pregunta pendiente
            if self._is_response_to_pending(message, context):
                return self._topic_to_category(current_topic)
        
        # Clasificar el mensaje por contenido
        content_category = self._classify_message(message, context)
        
        # Si es saludo y hay tema activo, podría ser continuación
        if content_category == MessageCategory.GREETING and is_continuation:
            # Verificar si parece reiniciar o continuar
            if self._seems_like_restart(message):
                return MessageCategory.GREETING
            else:
                return self._topic_to_category(current_topic)
        
        # Si detecta otro tema, permitir transición
        return content_category
    
    def _is_response_to_pending(self, message: str, context: PatientContext) -> bool:
        """Verifica si el mensaje parece responder a la pregunta pendiente."""
        pending = context.conversation.state.pending_action
        if not pending:
            return False
        
        # Respuestas cortas típicas a preguntas de sí/no
        short_responses = ["sí", "si", "no", "ok", "está bien", "bueno", "dale"]
        message_lower = message.lower().strip()
        
        if message_lower in short_responses or len(message_lower) < 20:
            return True
        
        return False
    
    def _seems_like_restart(self, message: str) -> bool:
        """Verifica si el mensaje parece querer reiniciar la conversación."""
        restart_patterns = ["hola de nuevo", "empecemos de nuevo", "otra cosa", "cambio de tema"]
        message_lower = message.lower()
        return any(p in message_lower for p in restart_patterns)
    
    def _topic_to_category(self, topic: ConversationTopic) -> MessageCategory:
        """Convierte ConversationTopic a MessageCategory."""
        mapping = {
            ConversationTopic.SYMPTOMS: MessageCategory.TRIAGE,
            ConversationTopic.MEDICATION: MessageCategory.MEDICATION,
            ConversationTopic.APPOINTMENTS: MessageCategory.APPOINTMENTS,
            ConversationTopic.CHECKIN: MessageCategory.CHECKIN,
            ConversationTopic.EMERGENCY: MessageCategory.TRIAGE,
            ConversationTopic.GENERAL: MessageCategory.GENERAL,
            ConversationTopic.GREETING: MessageCategory.GREETING,
        }
        return mapping.get(topic, MessageCategory.GENERAL)
    
    def _category_to_topic(self, category: MessageCategory) -> ConversationTopic:
        """Convierte MessageCategory a ConversationTopic."""
        mapping = {
            MessageCategory.TRIAGE: ConversationTopic.SYMPTOMS,
            MessageCategory.MEDICATION: ConversationTopic.MEDICATION,
            MessageCategory.APPOINTMENTS: ConversationTopic.APPOINTMENTS,
            MessageCategory.CHECKIN: ConversationTopic.CHECKIN,
            MessageCategory.GENERAL: ConversationTopic.GENERAL,
            MessageCategory.GREETING: ConversationTopic.GREETING,
        }
        return mapping.get(category, ConversationTopic.GENERAL)
    
    def _update_conversation_state(
        self,
        context: PatientContext,
        topic: ConversationTopic,
        agent: str
    ):
        """Actualiza el estado de conversación."""
        context.conversation.state.set_topic(topic, agent)
    
    def _update_conversation_after_response(
        self,
        context: PatientContext,
        category: MessageCategory,
        response: AgentResponse
    ):
        """Actualiza el estado después de procesar la respuesta."""
        topic = self._category_to_topic(category)
        self._update_conversation_state(context, topic, response.agent_used)
        
        # Detectar si hay pregunta pendiente en la respuesta
        if response.follow_up_questions:
            context.conversation.state.set_pending_question(
                response.follow_up_questions[0],
                response.agent_used
            )
        else:
            context.conversation.state.clear_pending()
    
    def _handle_new_patient(
        self,
        context: PatientContext,
        message: str
    ) -> AgentResponse:
        """
        Maneja el primer mensaje de una paciente nueva.
        Inicia conversación acogedora y registra el mensaje.
        """
        # Guardar el mensaje inicial
        context.conversation.add_user_message(message)
        
        # Verificar si el primer mensaje ya incluye síntomas o consulta
        risk_level, risk_score = self.triage_agent.quick_assess(message)
        
        if risk_level == "high":
            # Emergencia en primer mensaje
            self._update_conversation_state(context, ConversationTopic.EMERGENCY, "triage")
            return self.triage_agent.process(message, context)
        
        # Personalizar bienvenida según el contenido del mensaje
        if self.medication_agent.has_medication_keywords(message):
            welcome_text = ResponseTemplates.WELCOME_NEW_WITH_TOPIC.format(
                topic="medicación",
                follow_up="Cuéntame, ¿qué medicamento necesitas que te recuerde?"
            )
            self._update_conversation_state(context, ConversationTopic.MEDICATION, "orchestrator")
        elif self.appointments_agent.has_appointment_keywords(message):
            welcome_text = ResponseTemplates.WELCOME_NEW_WITH_TOPIC.format(
                topic="citas médicas",
                follow_up="¿Tienes una cita próxima que quieras que te recuerde?"
            )
            self._update_conversation_state(context, ConversationTopic.APPOINTMENTS, "orchestrator")
        elif risk_level in ["low", "medium"]:
            welcome_text = ResponseTemplates.WELCOME_NEW_WITH_SYMPTOMS
            self._update_conversation_state(context, ConversationTopic.SYMPTOMS, "orchestrator")
            # Procesar los síntomas después de la bienvenida
            return self._welcome_and_process(context, message, welcome_text)
        else:
            welcome_text = ResponseTemplates.WELCOME_NEW
            self._update_conversation_state(context, ConversationTopic.CHECKIN, "orchestrator")
        
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
    
    def _welcome_and_process(
        self,
        context: PatientContext,
        message: str,
        welcome_text: str
    ) -> AgentResponse:
        """Bienvenida que también procesa el contenido del mensaje."""
        # Procesar con el agente de check-in que manejará síntomas
        response = self.checkin_agent.process(message, context)
        
        # Combinar bienvenida con respuesta
        combined_text = f"{welcome_text}\n\n{response.reply_text}"
        response.reply_text = combined_text
        
        return response
    
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
