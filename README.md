# Pausiva Core

Sistema de acompañamiento diario por WhatsApp para mujeres en etapa de menopausia y peri-menopausia (40-60 años).

---

## El Problema

La menopausia es una etapa natural en la vida de toda mujer, pero frecuentemente viene acompañada de:

- **Síntomas físicos** como bochornos, sudoración nocturna, fatiga, dolores de cabeza y cambios en el sueño
- **Cambios emocionales** incluyendo ansiedad, irritabilidad, cambios de ánimo y dificultad para concentrarse
- **Falta de información** sobre qué es normal y cuándo buscar ayuda médica
- **Aislamiento** al no tener con quién hablar sobre estos cambios
- **Olvidos de medicación** y citas médicas importantes
- **Dificultad para hacer seguimiento** de síntomas para compartir con su médico

Muchas mujeres enfrentan esta etapa sin el acompañamiento adecuado, sintiéndose solas o minimizando síntomas que podrían requerir atención.

---

## La Solución: Pausiva

Pausiva es una **compañera virtual** que acompaña a las mujeres día a día durante esta etapa de transición. A través de WhatsApp, ofrece:

### Acompañamiento Diario
- Check-ins matutinos preguntando cómo se sienten
- Conversaciones empáticas que validan sus experiencias
- Recordatorios amigables de autocuidado

### Seguimiento Inteligente de Síntomas
- Registro automático de síntomas mencionados en conversación
- Clasificación de riesgo para detectar situaciones que requieren atención urgente
- Historial que pueden compartir con su médico

### Gestión de Medicación
- Recordatorios de medicamentos basados en sus recetas
- Seguimiento de adherencia al tratamiento
- Sin modificar ni sugerir cambios en la medicación

### Recordatorios de Citas
- Alertas de citas médicas próximas
- Ayuda para preparar preguntas para su doctor
- Seguimiento post-consulta

### Alertas de Riesgo
- Detección automática de síntomas graves
- Recomendación inmediata de buscar atención de urgencia cuando corresponde
- Números de emergencia disponibles

---

## Filosofía del Producto

### Lo que Pausiva SÍ hace
- Escucha y valida las experiencias de cada mujer
- Registra síntomas y genera un historial útil
- Envía recordatorios de medicación y citas
- Detecta situaciones de riesgo y alerta cuando es necesario
- Sugiere consultar a profesionales de salud
- Ofrece información general sobre autocuidado

### Lo que Pausiva NO hace
- **NO diagnostica** condiciones médicas
- **NO prescribe** ni sugiere medicamentos
- **NO reemplaza** la atención médica profesional
- **NO modifica** esquemas de medicación
- **NO da consejos médicos** específicos

### Tono de comunicación
- **Empático**: Valida emociones sin minimizar ni dramatizar
- **Claro**: Mensajes cortos y fáciles de leer en WhatsApp
- **Respetuoso**: Trata a cada mujer como adulta capaz
- **Cálido**: Como una amiga informada, no como un robot

---

## Ejemplos de Conversación

### Check-in matutino
```
Pausiva: Buenos días. ¿Cómo amaneciste hoy? ¿Cómo dormiste anoche?

Usuaria: Mal, me desperté como 5 veces con bochornos

Pausiva: Lamento escuchar eso. Las interrupciones de sueño por bochornos 
pueden ser muy agotadoras. ¿Cómo te sientes de energía esta mañana?
He registrado esto en tu seguimiento.

¿Hay algo más en lo que pueda ayudarte hoy?
```

### Registro de síntomas
```
Usuaria: Hoy me siento muy cansada y con dolor de cabeza

Pausiva: Gracias por contarme. El cansancio y el dolor de cabeza pueden 
ser comunes en esta etapa, pero es importante observar cómo evolucionan.

He registrado estos síntomas. Si el dolor de cabeza persiste o se 
intensifica, te recomiendo comentarlo con tu médica.

¿Has podido descansar un poco hoy?
```

### Medicación
```
Usuaria: Me recetaron tomar estrógenos 1mg cada mañana por 3 meses

Pausiva: He registrado tu medicación:
- Estrógenos 1mg
- Frecuencia: cada mañana
- Duración: 3 meses

Te enviaré un recordatorio diario. ¿A qué hora prefieres que te recuerde?

Recuerda: si tienes dudas sobre tu medicamento, es mejor consultarlo 
con tu médica o farmacéutica.
```

### Detección de riesgo alto
```
Usuaria: Tengo un dolor muy fuerte en el pecho y me cuesta respirar

Pausiva: Lo que me describes suena muy preocupante y es importante 
que busques ayuda médica de inmediato.

Por favor, acude a un servicio de urgencias lo antes posible.

Si estás en Chile, puedes llamar a:
- SAMU: 131
- Salud Responde: 600 360 7777

¿Hay alguien que pueda acompañarte?
```

### Recordatorio de cita
```
Pausiva: Hola, te recuerdo que mañana tienes cita:

📅 Viernes 15 de diciembre, 10:00
🏥 Dra. María López - Ginecología
📍 Centro Médico Las Condes

¿Confirmas que asistirás? ¿Necesitas ayuda preparando preguntas 
para tu consulta?
```

---

## Flujo Conversacional

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUJO DE CONVERSACIÓN                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐                                                   │
│  │ Nuevo mensaje│                                                   │
│  └──────┬───────┘                                                   │
│         │                                                           │
│         ▼                                                           │
│  ┌──────────────┐    Sí    ┌─────────────────────┐                 │
│  │ ¿Paciente    ├─────────►│ Bienvenida          │                 │
│  │ nueva?       │          │ personalizada       │                 │
│  └──────┬───────┘          └─────────┬───────────┘                 │
│         │ No                         │                              │
│         ▼                            │                              │
│  ┌──────────────┐                    │                              │
│  │ Clasificar   │◄───────────────────┘                              │
│  │ mensaje      │                                                   │
│  └──────┬───────┘                                                   │
│         │                                                           │
│    ┌────┴────┬─────────┬──────────┬──────────┐                     │
│    ▼         ▼         ▼          ▼          ▼                     │
│ ┌──────┐ ┌───────┐ ┌────────┐ ┌───────┐ ┌────────┐                │
│ │Triage│ │Medica-│ │Appoint-│ │Check- │ │General │                │
│ │      │ │ción   │ │ments   │ │in     │ │        │                │
│ └──┬───┘ └───┬───┘ └────┬───┘ └───┬───┘ └────┬───┘                │
│    │         │          │         │          │                     │
│    └─────────┴──────────┴─────────┴──────────┘                     │
│                         │                                           │
│                         ▼                                           │
│              ┌─────────────────────┐                               │
│              │ Respuesta empática  │                               │
│              │ + Registro síntomas │                               │
│              │ + Pregunta seguim.  │                               │
│              └─────────────────────┘                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Estado de Conversación

El sistema mantiene el contexto de la conversación para:

- **Continuar temas activos**: Si preguntó sobre medicación, las siguientes respuestas se interpretan en ese contexto
- **Hacer seguimiento**: Si reportó un síntoma, puede preguntar cómo evolucionó
- **Transiciones suaves**: Cambiar de tema sin perder el hilo

---

## Arquitectura Técnica

### Sistema Multi-Agente

```
                    Mensaje de WhatsApp
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      ORCHESTRATOR                                    │
│  - Recibe todos los mensajes                                        │
│  - Mantiene estado de conversación                                  │
│  - Clasifica intención del mensaje                                  │
│  - Detecta riesgo rápido                                            │
│  - Rutea al agente especializado                                    │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
│  TRIAGE AGENT   │ │ MEDICATION  │ │  APPOINTMENTS   │
│                 │ │   AGENT     │ │     AGENT       │
│ - Evalúa riesgo │ │             │ │                 │
│ - Clasifica     │ │ - Extrae    │ │ - Registra      │
│   síntomas      │ │   recetas   │ │   citas         │
│ - Alerta        │ │ - Programa  │ │ - Envía         │
│   urgencias     │ │   recordat. │ │   recordatorios │
└─────────────────┘ └─────────────┘ └─────────────────┘
          │                │                │
          └────────────────┼────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    CHECKIN AGENT                                     │
│  - Seguimiento diario                                               │
│  - Preguntas de bienestar                                           │
│  - Registro de estado emocional                                     │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    MEMORY / STORAGE                                  │
│  - Historial de conversación                                        │
│  - Perfil de paciente                                               │
│  - Síntomas registrados                                             │
│  - Medicación activa                                                │
│  - Citas programadas                                                │
└─────────────────────────────────────────────────────────────────────┘
```

### Agentes Especializados

| Agente | Responsabilidad | Se activa cuando |
|--------|-----------------|------------------|
| **Orchestrator** | Coordina todo, routing inteligente | Siempre (punto de entrada) |
| **TriageAgent** | Evalúa riesgo, detecta urgencias | Menciona síntomas, malestar, dolor |
| **MedicationAgent** | Extrae y gestiona recordatorios | Menciona recetas, pastillas, tratamiento |
| **AppointmentsAgent** | Gestiona citas médicas | Menciona citas, consultas, doctores |
| **CheckinAgent** | Seguimiento diario, bienestar | Responde sobre su estado, check-ins |
| **GeneralAgent** | Conversación general | Saludos, preguntas informativas |

---

## Clasificación de Riesgo

| Nivel | Score | Ejemplos | Acción |
|-------|-------|----------|--------|
| `high` | 80-100 | Dolor de pecho, dificultad respirar, sangrado abundante, ideación suicida | Urgencia inmediata + Alerta |
| `medium` | 40-79 | Síntomas persistentes, empeoramiento, efectos secundarios | Recomendar consulta pronto |
| `low` | 10-39 | Cansancio, bochornos, molestias leves | Seguimiento normal |
| `none` | 0-9 | Consultas informativas, saludos | Conversación normal |

### Síntomas de Alto Riesgo (detección automática)

- Dolor en el pecho
- Dificultad para respirar
- Sangrado abundante inesperado
- Ideas de hacerse daño
- Dolor súbito e intenso
- Alteración de conciencia
- Desmayos

---

## Estructura del Monorepo

```
pausiva-core/
├── backend/                        # Backend Python
│   ├── packages/
│   │   ├── agent/                  # Paquete del agente de IA
│   │   │   └── pausiva_agent/
│   │   │       ├── agents/         # Agentes especializados
│   │   │       ├── database/       # Integración Supabase
│   │   │       ├── models/         # Modelos de datos
│   │   │       └── memory/         # Sistema de memoria
│   │   └── whatsapp/               # Integración con WhatsApp
│   │
│   ├── services/api/               # Servidor HTTP REST
│   ├── scripts/                    # Scripts de testing
│   └── docs/                       # OpenAPI/Swagger
│
├── front/                          # Dashboard Next.js
├── wa-agent-gateway/               # Gateway WhatsApp (Node.js)
├── data/                           # Datos locales (gitignored)
├── .env                            # Variables de entorno
└── requirements.txt                # Dependencias Python
```

---

## Instalación Rápida

```bash
# 1. Clonar
git clone https://github.com/tu-org/pausiva-core.git
cd pausiva-core

# 2. Entorno virtual
python3 -m venv env
source env/bin/activate

# 3. Dependencias
pip install -r requirements.txt
cd backend/packages/agent && pip install -e . && cd ../../..

# 4. Configurar API Key
echo "GOOGLE_API_KEY=tu_api_key" > .env

# 5. Probar
python backend/scripts/test_api.py -p "+56912345678" -m "Hola"
```

---

## API REST

### Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/message` | Procesar mensaje de paciente |
| `POST` | `/checkin` | Generar check-in proactivo |
| `GET` | `/context/{phone}` | Obtener contexto de paciente |
| `DELETE` | `/patient/{phone}` | Eliminar datos (testing) |
| `GET` | `/storage/status` | Estado del almacenamiento |
| `GET` | `/docs` | Swagger UI |

### Ejemplo: Enviar mensaje

```bash
curl -X POST http://localhost:8080/message \
  -H "Content-Type: application/json" \
  -d '{"phone": "+56912345678", "message": "Me siento muy cansada hoy"}'
```

**Respuesta:**
```json
{
  "reply_text": "Lamento escuchar que te sientes cansada. El cansancio puede ser común en esta etapa, pero es importante escuchar a tu cuerpo. ¿Has podido descansar? ¿Cómo dormiste anoche?",
  "actions": ["SEND_MESSAGE", "UPDATE_SYMPTOM_TRACKING"],
  "risk_level": "low",
  "risk_score": 20,
  "symptom_summary": "Cansancio reportado",
  "follow_up_questions": ["¿Cómo dormiste anoche?"],
  "agent_used": "checkin"
}
```

### Iniciar servidor

```bash
python backend/services/api/server.py

# Documentación: http://localhost:8080/docs
```

---

## Integración con WhatsApp

```python
from pausiva_agent import PausivaOrchestrator

pausiva = PausivaOrchestrator(storage_path="data")

def handle_whatsapp_message(phone: str, message: str):
    response = pausiva.process_message(phone, message)
    
    # Enviar respuesta
    send_whatsapp_message(phone, response.reply_text)
    
    # Manejar acciones especiales
    if "OPEN_RISK_ALERT" in response.actions:
        notify_emergency_contact(phone, response)
        notify_staff_dashboard(phone, response)
    
    if "SCHEDULE_MED_REMINDERS" in response.actions:
        schedule_medication_cron(phone, response.medication_schedule)
    
    return response.to_dict()
```

---

## Variables de Entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `GOOGLE_API_KEY` | API Key de Google AI Studio | Sí |
| `SUPABASE_URL` | URL del proyecto Supabase | No* |
| `SUPABASE_SERVICE_KEY` | Service Role Key | No* |

*Supabase es opcional. Sin configurar, usa JSON local.

---

## Almacenamiento

### Desarrollo (JSON local)
```
data/
├── patients/56912345678.json
├── conversations/56912345678.json
├── medications/56912345678.json
├── appointments/56912345678.json
└── symptoms/56912345678.json
```

### Producción (Supabase)
- `patients` - Perfiles con `clinical_profile_json`
- `appointments` - Citas médicas
- `followings` - Interacciones y síntomas
- `patient_timeline_events` - Historial de eventos

---

## Limitaciones

- No reemplaza atención médica profesional
- No diagnostica ni prescribe medicación
- Requiere conexión a internet
- Orientado a mujeres de 40-60 años en etapa de menopausia

---

## Licencia

MIT License

---

## Contacto

Para dudas o contribuciones, crear un issue en el repositorio.
