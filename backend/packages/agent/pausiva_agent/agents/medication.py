"""
Agente de Medicación - Gestiona recordatorios de medicamentos.
"""
from .base import BaseAgent
from .prompts import BASE_SYSTEM_PROMPT, MEDICATION_PROMPT
from ..models.response import AgentResponse
from ..models.medication import Medication
from ..memory.patient_context import PatientContext


class MedicationAgent(BaseAgent):
    """
    Agente especializado en gestionar medicación.
    Extrae información de recetas y crea recordatorios.
    """
    
    def __init__(self):
        super().__init__(
            name="medication",
            system_prompt=f"{BASE_SYSTEM_PROMPT}\n\n{MEDICATION_PROMPT}",
            temperature=0.3  # Baja temperatura para extracción precisa
        )
    
    def process(
        self,
        message: str,
        context: PatientContext
    ) -> AgentResponse:
        """
        Procesa el mensaje relacionado con medicación.
        """
        # Incluir medicación activa en el prompt adicional
        active_meds = context.get_active_medications()
        meds_info = ""
        if active_meds:
            meds_info = "\nMEDICACIÓN ACTIVA ACTUAL:\n"
            for med in active_meds:
                meds_info += f"- {med.name}: {med.frequency_text}\n"
        
        additional_prompt = f"""
{meds_info}

ANALIZA el mensaje de la paciente:
1. Si envía una receta, extrae la información de cada medicamento.
2. Estructura el plan de recordatorios.
3. Si falta información (horarios, duración), pregunta de forma simple.
4. NO modifiques las dosis ni opines sobre los medicamentos.
5. Incluye SCHEDULE_MED_REMINDERS en actions si detectas nueva medicación.
"""
        response = self._default_process(message, context, additional_prompt)
        
        # Procesar medicación nueva si existe
        if response.medication_schedule:
            self._save_medications(context, response.medication_schedule)
        
        return response
    
    def _save_medications(self, context: PatientContext, medication_data: list[dict]):
        """Guarda los medicamentos extraídos en el contexto."""
        for med_dict in medication_data:
            medication = Medication(
                name=med_dict.get("medicine_name", "Sin nombre"),
                raw_text=med_dict.get("raw_text", ""),
                frequency_text=med_dict.get("frequency_text", ""),
                times_of_day=med_dict.get("times_of_day", []),
                duration_days=med_dict.get("duration_days")
            )
            context.add_medication(medication)
    
    def has_medication_keywords(self, message: str) -> bool:
        """
        Verifica si el mensaje contiene palabras relacionadas con medicación.
        Útil para el orquestador.
        """
        keywords = [
            "receta", "medicamento", "pastilla", "tableta", "cápsula",
            "jarabe", "dosis", "tomar", "mg", "ml", "cada", "horas",
            "mañana", "noche", "antes", "después", "comida",
            "farmacia", "médico recetó", "me recetaron"
        ]
        message_lower = message.lower()
        return any(keyword in message_lower for keyword in keywords)
