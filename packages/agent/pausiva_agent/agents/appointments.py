"""
Agente de Citas - Gestiona recordatorios de citas médicas.
"""
from datetime import datetime
import uuid

from .base import BaseAgent
from .prompts import BASE_SYSTEM_PROMPT, APPOINTMENTS_PROMPT
from ..models.response import AgentResponse
from ..models.appointment import Appointment, AppointmentStatus
from ..memory.patient_context import PatientContext


class AppointmentsAgent(BaseAgent):
    """
    Agente especializado en gestionar citas médicas.
    """
    
    def __init__(self):
        super().__init__(
            name="appointments",
            system_prompt=f"{BASE_SYSTEM_PROMPT}\n\n{APPOINTMENTS_PROMPT}",
            temperature=0.5
        )
    
    def process(
        self,
        message: str,
        context: PatientContext
    ) -> AgentResponse:
        """
        Procesa el mensaje relacionado con citas.
        """
        # Incluir citas próximas en el prompt
        upcoming = context.get_upcoming_appointments()
        appointments_info = ""
        if upcoming:
            appointments_info = "\nCITAS PRÓXIMAS:\n"
            for apt in upcoming:
                appointments_info += f"- {apt.date} {apt.time}: {apt.specialist_type} (ID: {apt.appointment_id})\n"
        else:
            appointments_info = "\nNo hay citas próximas registradas.\n"
        
        additional_prompt = f"""
{appointments_info}

ANALIZA el mensaje de la paciente:
1. Si menciona una cita existente, usa la información del contexto.
2. Si quiere agendar una nueva cita, extrae fecha, hora y especialidad.
3. Determina la acción: REMIND, CONFIRM, CANCEL_REQUEST, RESCHEDULE_REQUEST.
4. NO inventes fechas ni horarios que no estén en el contexto o mensaje.
5. Incluye SCHEDULE_APPOINTMENT_REMINDERS en actions si es relevante.
"""
        response = self._default_process(message, context, additional_prompt)
        
        # Procesar citas nuevas si existen
        if response.appointments:
            self._process_appointments(context, response.appointments)
        
        return response
    
    def _process_appointments(self, context: PatientContext, appointments_data: list[dict]):
        """Procesa las acciones de citas."""
        for apt_dict in appointments_data:
            action = apt_dict.get("action", "REMIND")
            
            if action in ["REMIND", "CONFIRM"]:
                # Buscar cita existente o crear nueva
                apt_id = apt_dict.get("appointment_id")
                if apt_id:
                    # Actualizar cita existente
                    for apt in context.appointments:
                        if apt.appointment_id == apt_id:
                            if action == "CONFIRM":
                                apt.status = AppointmentStatus.CONFIRMED
                            break
                elif apt_dict.get("date") and apt_dict.get("time"):
                    # Crear nueva cita
                    appointment = Appointment(
                        appointment_id=str(uuid.uuid4())[:8],
                        phone_number=context.phone_number,
                        date=apt_dict["date"],
                        time=apt_dict["time"],
                        specialist_type=apt_dict.get("specialist_type", "Consulta general"),
                        notes=apt_dict.get("notes", "")
                    )
                    context.add_appointment(appointment)
    
    def has_appointment_keywords(self, message: str) -> bool:
        """
        Verifica si el mensaje contiene palabras relacionadas con citas.
        """
        keywords = [
            "cita", "consulta", "hora", "turno", "agendar", "reservar",
            "doctor", "doctora", "médico", "médica", "especialista",
            "ginecólogo", "ginecóloga", "cancelar", "reagendar", "cambiar",
            "confirmar", "hospital", "clínica", "centro médico"
        ]
        message_lower = message.lower()
        return any(keyword in message_lower for keyword in keywords)
