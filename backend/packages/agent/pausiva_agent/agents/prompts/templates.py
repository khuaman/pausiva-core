"""
Templates de respuesta para situaciones comunes.
Sistema conversacional continuo para Pausiva.
"""


class ResponseTemplates:
    """Templates de respuesta reutilizables - conversacionales y abiertos."""
    
    # === BIENVENIDA ===
    
    WELCOME_NEW = """Hola, bienvenida a Pausiva.

Soy tu asistente de acompañamiento diario. Estoy aquí para escucharte y ayudarte con:

- Seguimiento de cómo te sientes día a día
- Recordatorios de medicamentos
- Recordatorios de citas médicas

Cuéntame, ¿cómo te sientes hoy?"""

    WELCOME_NEW_WITH_TOPIC = """Hola, bienvenida a Pausiva.

Soy tu asistente de acompañamiento diario. Veo que quieres hablar sobre {topic}.

{follow_up}"""

    WELCOME_NEW_WITH_SYMPTOMS = """Hola, bienvenida a Pausiva.

Soy tu asistente de acompañamiento diario. Gracias por compartir cómo te sientes."""

    WELCOME_RETURNING = """Hola, qué gusto saludarte de nuevo.

¿Cómo has estado? Cuéntame qué hay de nuevo."""
    
    WELCOME_AFTER_PAUSE = """Hola, qué bueno volver a saber de ti.

Ha pasado un tiempo desde nuestra última conversación. ¿Cómo te has sentido estos días?"""

    # === EMERGENCIAS ===
    
    HIGH_RISK_ALERT = """Lo que me describes requiere atención médica urgente.

Por favor, busca ayuda médica ahora. Si estás en Chile:
- SAMU: 131
- Salud Responde: 600 360 7777

¿Hay alguien que pueda acompañarte? Quedo aquí contigo mientras tanto."""

    MEDIUM_RISK_RECOMMENDATION = """Esto me parece importante de revisar con tu médica en los próximos días.

Si los síntomas empeoran, no esperes y busca atención antes.

¿Quieres que te ayude a preparar preguntas para tu consulta? O cuéntame más sobre cómo te sientes."""
    
    RISK_FOLLOWUP = """Entiendo que es preocupante. ¿Puedes contarme un poco más? Por ejemplo:
- ¿Desde cuándo te sientes así?
- ¿Ha empeorado o mejorado?
- ¿Hay algo que lo alivie o lo empeore?"""

    # === MEDICACIÓN ===
    
    MEDICATION_REGISTERED = """Perfecto, ya quedó registrado. Te enviaré recordatorios según los horarios indicados.

¿Tienes algún otro medicamento que agregar? Si tienes dudas sobre tu medicamento, consulta con tu médica o farmacéutica."""

    MEDICATION_CLARIFICATION = """Para configurar bien los recordatorios, necesito un par de detalles más:

{question}"""

    MEDICATION_CONFIRMED = """Listo, entonces te recordaré tomar {medication} a las {time}.

¿Hay algo más que necesites?"""

    MEDICATION_EFFECT_CONCERN = """Entiendo tu preocupación sobre el medicamento. Los efectos secundarios pueden variar de persona a persona.

¿Puedes contarme más sobre lo que sientes? Así puedo ayudarte a determinar si es algo para consultar con tu médica pronto."""

    # === CITAS ===
    
    APPOINTMENT_REMINDER = """Tienes una cita próxima:

Fecha: {date}
Hora: {time}
Especialidad: {specialist}

¿Confirmas que asistirás? Si necesitas cambiarla, también puedo ayudarte."""

    APPOINTMENT_CONFIRMED = """Perfecto, registrado. Te recordaré el día anterior.

¿Hay algo que quieras preparar para esta consulta? Puedo ayudarte a pensar en preguntas."""

    APPOINTMENT_NEW = """Entendido, voy a registrar esta cita. Para confirmar:
- Fecha: {date}
- Hora: {time}
- Especialidad: {specialist}

¿Está correcto? ¿Quieres agregar alguna nota?"""

    APPOINTMENT_RESCHEDULE = """Entiendo que necesitas cambiar la cita. ¿Para cuándo te gustaría reagendarla?"""

    APPOINTMENT_PREPARATION = """Para tu consulta del {date}, podría ser útil anotar:
- Síntomas que has tenido últimamente
- Preguntas específicas para tu {specialist}
- Lista de medicamentos actuales

¿Quieres que te ayude a preparar alguna de estas cosas?"""

    # === CHECK-IN ===
    
    CHECKIN_MORNING = """Buenos días. ¿Cómo amaneciste hoy? ¿Cómo dormiste anoche?"""

    CHECKIN_AFTERNOON = """Buenas tardes. ¿Cómo va tu día hasta ahora?"""

    CHECKIN_EVENING = """Buenas noches. ¿Cómo estuvo tu día? ¿Cómo te sientes ahora?"""

    SYMPTOM_LOGGED = """Gracias por contarme. He registrado esta información.

{recommendation}

¿Hay algo más que quieras compartir o en lo que pueda ayudarte?"""

    SYMPTOM_POSITIVE = """Qué bueno escuchar eso. Me alegra que te sientas bien.

¿Hay algo en lo que pueda ayudarte hoy?"""

    CHECKIN_FOLLOWUP = """Gracias por contarme. Cuéntame un poco más, ¿cómo ha sido esto para ti?"""

    VALIDATE_FEELINGS = """Entiendo que te sientes {feeling}. Es completamente válido sentirse así.

¿Quieres contarme más sobre lo que está pasando?"""

    # === GENERALES ===
    
    DISCLAIMER = """Recuerda que esta orientación no sustituye una consulta con tu médica."""

    CANT_HELP = """Entiendo tu consulta. Esto está un poco fuera de lo que puedo ayudarte directamente.

Para temas médicos específicos, te recomiendo consultar con tu médica. Pero si tienes otra consulta, estoy aquí."""

    ERROR_RESPONSE = """Hubo un problema procesando tu mensaje. ¿Puedes intentar escribirlo de otra forma?

Estoy aquí para ayudarte."""

    CONTINUE_CONVERSATION = """¿Hay algo más en lo que pueda ayudarte?"""

    OFFER_OPTIONS = """Puedo ayudarte con:
- Registrar cómo te sientes día a día
- Recordatorios de medicamentos
- Recordatorios de citas médicas

¿Qué necesitas hoy?"""

    TOPIC_TRANSITION = """Entendido. Sobre {previous_topic}: {previous_response}

Ahora, respecto a {new_topic}: {new_response}"""

    ACKNOWLEDGE_AND_CONTINUE = """Gracias por contarme. {response}

¿Hay algo más que quieras compartir?"""

