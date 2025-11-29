"""
Agente de Triaje - Clasifica el nivel de riesgo de los síntomas.
"""
from .base import BaseAgent
from .prompts import BASE_SYSTEM_PROMPT, TRIAGE_PROMPT
from ..models.response import AgentResponse
from ..memory.patient_context import PatientContext


class TriageAgent(BaseAgent):
    """
    Agente especializado en clasificar el nivel de riesgo.
    Analiza síntomas y determina urgencia.
    """
    
    def __init__(self):
        super().__init__(
            name="triage",
            system_prompt=f"{BASE_SYSTEM_PROMPT}\n\n{TRIAGE_PROMPT}",
            temperature=0.5  # Menor temperatura para clasificación más consistente
        )
    
    def process(
        self,
        message: str,
        context: PatientContext
    ) -> AgentResponse:
        """
        Procesa el mensaje y clasifica el riesgo.
        """
        additional_prompt = """
ANALIZA el mensaje de la paciente y:
1. Identifica síntomas mencionados.
2. Clasifica el nivel de riesgo (none, low, medium, high).
3. Asigna un score de 0-100.
4. Si es high, incluye OPEN_RISK_ALERT en actions.
5. Responde con empatía validando sus emociones.
"""
        return self._default_process(message, context, additional_prompt)
    
    def quick_assess(self, message: str) -> tuple[str, int]:
        """
        Evaluación rápida del riesgo sin contexto completo.
        Retorna (risk_level, risk_score).
        Útil para el orquestador.
        """
        # Palabras clave de alto riesgo
        high_risk_keywords = [
            "no puedo respirar", "dolor en el pecho", "dolor intenso",
            "sangrado", "desmayo", "suicid", "morir", "matar",
            "urgencia", "emergencia", "ayuda urgente"
        ]
        
        # Palabras clave de riesgo medio
        medium_risk_keywords = [
            "varios días", "empeora", "no mejora", "preocupa",
            "ansiedad", "depresión", "insomnio", "no puedo dormir",
            "efecto secundario", "reacción"
        ]
        
        message_lower = message.lower()
        
        # Verificar alto riesgo
        for keyword in high_risk_keywords:
            if keyword in message_lower:
                return ("high", 85)
        
        # Verificar riesgo medio
        for keyword in medium_risk_keywords:
            if keyword in message_lower:
                return ("medium", 50)
        
        # Verificar mención de síntomas en general
        symptom_keywords = [
            "dolor", "molestia", "cansada", "cansancio", "fatiga",
            "mareo", "náusea", "fiebre", "mal", "síntoma"
        ]
        
        for keyword in symptom_keywords:
            if keyword in message_lower:
                return ("low", 25)
        
        return ("none", 0)
