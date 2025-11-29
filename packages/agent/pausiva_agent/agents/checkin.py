"""
Agente de Check-in - Seguimiento diario del estado de la paciente.
"""
from datetime import datetime

from .base import BaseAgent
from .prompts import BASE_SYSTEM_PROMPT, CHECKIN_PROMPT
from ..models.response import AgentResponse
from ..memory.patient_context import PatientContext


class CheckinAgent(BaseAgent):
    """
    Agente especializado en el seguimiento diario.
    Registra síntomas y estado emocional.
    """
    
    def __init__(self):
        super().__init__(
            name="checkin",
            system_prompt=f"{BASE_SYSTEM_PROMPT}\n\n{CHECKIN_PROMPT}",
            temperature=0.7
        )
    
    def process(
        self,
        message: str,
        context: PatientContext
    ) -> AgentResponse:
        """
        Procesa el mensaje de check-in.
        """
        # Incluir historial reciente de síntomas
        recent_symptoms = context.symptom_history[-5:] if context.symptom_history else []
        symptoms_info = ""
        if recent_symptoms:
            symptoms_info = "\nHISTORIAL RECIENTE DE SÍNTOMAS:\n"
            for entry in recent_symptoms:
                symptoms_info += f"- {entry.get('timestamp', 'N/A')}: {entry.get('summary', 'Sin resumen')} (Riesgo: {entry.get('risk_level', 'none')})\n"
        
        # Determinar momento del día para personalizar
        hour = datetime.now().hour
        greeting = ""
        if 5 <= hour < 12:
            greeting = "Buenos días."
        elif 12 <= hour < 19:
            greeting = "Buenas tardes."
        else:
            greeting = "Buenas noches."
        
        additional_prompt = f"""
{symptoms_info}

MOMENTO DEL DÍA: {greeting}

ANALIZA el mensaje de la paciente:
1. Identifica cómo se siente hoy (físico y emocional).
2. Resume en "symptom_summary" los síntomas o estado reportado.
3. Valida sus emociones sin minimizar ni dramatizar.
4. Da recomendaciones generales de autocuidado si aplica.
5. Incluye UPDATE_SYMPTOM_TRACKING en actions.
6. Si menciona síntomas preocupantes, clasifica el riesgo apropiadamente.
"""
        return self._default_process(message, context, additional_prompt)
    
    def generate_checkin_prompt(self, context: PatientContext) -> str:
        """
        Genera un mensaje de check-in proactivo para la paciente.
        """
        hour = datetime.now().hour
        
        if 5 <= hour < 12:
            return "Buenos días. ¿Cómo amaneciste hoy? ¿Cómo dormiste anoche?"
        elif 12 <= hour < 19:
            return "Buenas tardes. ¿Cómo va tu día? ¿Algún síntoma o molestia que quieras reportar?"
        else:
            return "Buenas noches. ¿Cómo te sentiste hoy en general? ¿Cómo estuvo tu energía durante el día?"
    
    def is_checkin_response(self, message: str) -> bool:
        """
        Verifica si el mensaje es una respuesta a un check-in.
        """
        # Respuestas típicas a "¿cómo te sientes?"
        checkin_patterns = [
            "bien", "mal", "más o menos", "regular", "cansada",
            "dormí", "sueño", "energía", "ánimo", "hoy me siento",
            "estoy", "me siento", "amanecí", "desperté"
        ]
        message_lower = message.lower()
        return any(pattern in message_lower for pattern in checkin_patterns)
