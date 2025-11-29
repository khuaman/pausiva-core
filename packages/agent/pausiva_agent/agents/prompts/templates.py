"""
Templates de respuesta para situaciones comunes.
"""


class ResponseTemplates:
    """Templates de respuesta reutilizables."""
    
    # === BIENVENIDA ===
    
    WELCOME_NEW = """Hola, bienvenida a Pausiva.

Soy tu asistente de acompañamiento diario. Estoy aquí para ayudarte a:

- Hacer seguimiento de cómo te sientes
- Recordarte tus medicamentos
- Recordarte tus citas médicas

¿Cómo te sientes hoy?"""

    WELCOME_RETURNING = """Hola, qué gusto saludarte de nuevo.

¿Cómo has estado? ¿Hay algo en lo que pueda ayudarte hoy?"""

    # === EMERGENCIAS ===
    
    HIGH_RISK_ALERT = """Lo que me describes suena serio y requiere atención médica urgente.

Por favor, contacta a tu servicio de salud local o acude a urgencias lo antes posible.

Si estás en Chile, puedes llamar a:
- SAMU: 131
- Salud Responde: 600 360 7777

¿Hay alguien que pueda acompañarte?"""

    MEDIUM_RISK_RECOMMENDATION = """Te recomiendo que hables con tu médica sobre esto en los próximos días.

Si los síntomas empeoran o aparecen nuevos síntomas, no dudes en buscar atención más pronto.

¿Quieres que te ayude a preparar algunas preguntas para tu consulta?"""

    # === MEDICACIÓN ===
    
    MEDICATION_REGISTERED = """He registrado tu medicación. Te enviaré recordatorios según los horarios indicados.

Recuerda: si tienes dudas sobre tu medicamento, es mejor consultarlo con tu médica o farmacéutica."""

    MEDICATION_CLARIFICATION = """Para poder ayudarte mejor con los recordatorios, necesito aclarar algunos detalles de tu receta.

{question}"""

    # === CITAS ===
    
    APPOINTMENT_REMINDER = """Tienes una cita próxima:

Fecha: {date}
Hora: {time}
Especialidad: {specialist}

¿Confirmas que asistirás?"""

    APPOINTMENT_CONFIRMED = """Perfecto, he registrado tu confirmación.

Te enviaré un recordatorio el día anterior."""

    # === CHECK-IN ===
    
    CHECKIN_MORNING = """Buenos días. ¿Cómo amaneciste hoy?

¿Cómo dormiste anoche?"""

    CHECKIN_AFTERNOON = """Buenas tardes. ¿Cómo va tu día?

¿Algún síntoma o molestia que quieras reportar?"""

    SYMPTOM_LOGGED = """Gracias por compartir cómo te sientes. He registrado esta información.

Llevar este registro te ayudará a ti y a tu médica a ver cómo evolucionas.

{recommendation}"""

    # === GENERALES ===
    
    DISCLAIMER = """Recuerda que esta orientación no sustituye una consulta con tu médica o profesional de salud."""

    CANT_HELP = """Entiendo tu consulta, pero esto queda fuera de lo que puedo ayudarte.

Para temas médicos específicos, te recomiendo consultar directamente con tu médica."""

    ERROR_RESPONSE = """Hubo un problema procesando tu mensaje. Por favor, intenta de nuevo.

Si el problema persiste, escribe "ayuda" para ver las opciones disponibles."""

