# Pausiva Core

Monorepo del sistema multiagente de acompañamiento diario para mujeres de 40 a 60 años, diseñado para comunicarse por WhatsApp.

## Descripción

Pausiva es un asistente de IA que proporciona:

- **Acompañamiento emocional** diario
- **Seguimiento de síntomas** con clasificación de riesgo
- **Recordatorios de medicación** basados en recetas médicas
- **Gestión de citas médicas** con integración a calendarios
- **Alertas de riesgo** cuando se detectan síntomas preocupantes

**Importante:** Pausiva NO es médico, NO diagnostica, NO prescribe medicación. Solo entrega recomendaciones generales de autocuidado y sugiere consultar profesionales de salud cuando corresponde.

---

## Estructura del Monorepo

```
pausiva-core/
├── packages/
│   ├── agent/                      # Paquete del agente de IA
│   │   ├── pausiva_agent/          # Código Python importable
│   │   │   ├── agents/             # Agentes especializados
│   │   │   │   ├── base.py         # Clase base
│   │   │   │   ├── orchestrator.py # Orquestador principal
│   │   │   │   ├── triage.py       # Clasificación de riesgo
│   │   │   │   ├── medication.py   # Gestión de medicación
│   │   │   │   ├── appointments.py # Gestión de citas
│   │   │   │   ├── checkin.py      # Check-in diario
│   │   │   │   └── prompts/        # Prompts del sistema
│   │   │   ├── models/             # Modelos de datos
│   │   │   └── memory/             # Sistema de memoria
│   │   ├── pyproject.toml
│   │   └── README.md
│   │
│   └── whatsapp/                   # Integración con WhatsApp
│       └── README.md               # Instrucciones para integración
│
├── services/
│   └── api/
│       └── server.py               # Servidor HTTP REST
│
├── scripts/
│   ├── test_api.py                 # Testing con JSON output
│   └── main.py                     # Demo del sistema
│
├── docs/
│   └── openapi.yaml                # Especificación Swagger/OpenAPI
│
├── data/                           # Datos de pacientes (gitignored)
│   ├── patients/
│   ├── conversations/
│   ├── medications/
│   ├── appointments/
│   └── symptoms/
│
├── .env                            # Variables de entorno
├── .gitignore
├── requirements.txt
└── README.md
```

---

## Requisitos

- Python 3.10+
- API Key de Google AI (Gemini)

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone <tu-repositorio>
cd pausiva-core
```

### 2. Crear entorno virtual

```bash
python3 -m venv env
source env/bin/activate  # En Windows: env\Scripts\activate
```

### 3. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 4. Instalar el paquete agent (modo desarrollo)

```bash
cd packages/agent
pip install -e .
cd ../..
```

### 5. Configurar API Key

Crea un archivo `.env` en la raíz del proyecto:

```bash
echo "GOOGLE_API_KEY=tu_api_key_aqui" > .env
```

Obtén tu API key en: https://aistudio.google.com/app/apikey

---

## Uso Rápido

### Testing con CLI (JSON output)

```bash
# Enviar mensaje
python scripts/test_api.py --phone "+56912345678" --message "Hola, me duele la cabeza"

# Ver contexto de una paciente
python scripts/test_api.py --phone "+56912345678" --context

# Reset paciente (para testing)
python scripts/test_api.py --phone "+56912345678" --reset
```

### Demo del sistema

```bash
python scripts/main.py
```

### Servidor HTTP REST

```bash
python services/api/server.py

# El servidor escucha en http://localhost:8080
# Ver documentación en: http://localhost:8080/docs (Swagger UI)
```

---

## API REST

### Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/message` | Procesar mensaje de paciente |
| `POST` | `/checkin` | Generar check-in proactivo |
| `GET` | `/context/{phone}` | Obtener contexto de paciente |
| `DELETE` | `/patient/{phone}` | Eliminar datos de paciente |
| `GET` | `/health` | Health check |
| `GET` | `/docs` | Documentación Swagger UI |

### POST /message

Procesa un mensaje de WhatsApp y devuelve respuesta estructurada.

**Request:**
```json
{
  "phone": "+56912345678",
  "message": "Hola, me siento cansada y con dolor de cabeza"
}
```

**Response:**
```json
{
  "reply_text": "Lamento escuchar que te sientes cansada...",
  "actions": ["SEND_MESSAGE", "UPDATE_SYMPTOM_TRACKING"],
  "risk_level": "low",
  "risk_score": 25,
  "symptom_summary": "Cansancio y dolor de cabeza leve",
  "medication_schedule": [],
  "appointments": [],
  "follow_up_questions": ["¿Has podido descansar?"],
  "agent_used": "checkin"
}
```

### POST /checkin

Genera mensaje de check-in proactivo para enviar a una paciente.

**Request:**
```json
{
  "phone": "+56912345678"
}
```

**Response:**
```json
{
  "reply_text": "Buenos días. ¿Cómo amaneciste hoy? ¿Cómo dormiste anoche?",
  "actions": ["SEND_MESSAGE"],
  "risk_level": "none",
  "risk_score": 0,
  "agent_used": "checkin"
}
```

### GET /context/{phone}

Obtiene el contexto completo de una paciente.

**Response:**
```json
{
  "patient": {
    "name": null,
    "phone": "+56912345678",
    "profile": {
      "age": null,
      "medical_conditions": [],
      "allergies": [],
      "current_medications": []
    },
    "current_risk_level": "none",
    "current_risk_score": 0
  },
  "active_medications": [],
  "upcoming_appointments": [],
  "recent_symptoms": [],
  "conversation_summary": "..."
}
```

### DELETE /patient/{phone}

Elimina todos los datos de una paciente (para testing).

**Response:**
```json
{
  "status": "ok",
  "deleted_files": [
    "/data/patients/56912345678.json",
    "/data/conversations/56912345678.json"
  ]
}
```

---

## Ejemplos con cURL

```bash
# Health check
curl http://localhost:8080/health

# Enviar mensaje
curl -X POST http://localhost:8080/message \
  -H "Content-Type: application/json" \
  -d '{"phone": "+56912345678", "message": "Hola, me duele la cabeza"}'

# Check-in proactivo
curl -X POST http://localhost:8080/checkin \
  -H "Content-Type: application/json" \
  -d '{"phone": "+56912345678"}'

# Ver contexto
curl http://localhost:8080/context/+56912345678

# Reset paciente
curl -X DELETE http://localhost:8080/patient/+56912345678
```

---

## Integración desde Python

### Uso directo del paquete

```python
import sys
sys.path.insert(0, "packages/agent")

from pausiva_agent import PausivaOrchestrator

# Inicializar con ruta de datos
pausiva = PausivaOrchestrator(storage_path="data")

# Procesar mensaje
response = pausiva.process_message(
    phone_number="+56912345678",
    message="Hola, me siento cansada"
)

# Acceder a la respuesta
print(response.reply_text)       # Texto para WhatsApp
print(response.risk_level)       # none, low, medium, high
print(response.risk_score)       # 0-100
print(response.actions)          # Lista de acciones
print(response.to_dict())        # JSON completo
```

### Acceder al contexto de paciente

```python
context = pausiva.get_patient_context("+56912345678")

# Información del perfil
print(context.patient.name)
print(context.patient.current_risk_level)

# Medicación activa
for med in context.get_active_medications():
    print(f"{med.name}: {med.frequency_text}")

# Citas próximas
for apt in context.get_upcoming_appointments():
    print(f"{apt.date} {apt.time}: {apt.specialist_type}")

# Historial de síntomas
for entry in context.symptom_history:
    print(f"{entry['timestamp']}: {entry['summary']}")
```

### Enviar check-in proactivo

```python
response = pausiva.send_checkin(phone_number="+56912345678")
print(response.reply_text)
# "Buenos días. ¿Cómo amaneciste hoy?"
```

---

## Acciones del Backend

El campo `actions` en la respuesta indica qué debe hacer tu backend:

| Acción | Descripción | Acción requerida |
|--------|-------------|------------------|
| `SEND_MESSAGE` | Enviar respuesta | Enviar `reply_text` por WhatsApp |
| `OPEN_RISK_ALERT` | Riesgo alto detectado | Activar alerta de emergencia |
| `UPDATE_SYMPTOM_TRACKING` | Síntomas registrados | Ya guardado automáticamente |
| `SCHEDULE_MED_REMINDERS` | Medicación detectada | Programar cron con `medication_schedule` |
| `SCHEDULE_APPOINTMENT_REMINDERS` | Cita detectada | Programar recordatorio con `appointments` |

---

## Sistema de Agentes

### Arquitectura

```
Mensaje WhatsApp
       ↓
┌─────────────────┐
│  Orchestrator   │ ← Punto de entrada
└────────┬────────┘
         │ Clasificación
         ↓
┌────────┴────────┐
│                 │
↓                 ↓
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ Triage  │  │Medication│  │Appoint- │  │ Checkin │
│         │  │          │  │ments    │  │         │
└────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘
     │            │            │            │
     └────────────┴────────────┴────────────┘
                       ↓
              ┌───────────────┐
              │ Memory/Storage│
              └───────────────┘
                       ↓
              Respuesta JSON
```

### Agentes

| Agente | Función | Activa cuando |
|--------|---------|---------------|
| **Orchestrator** | Coordina todo, routing | Siempre (punto de entrada) |
| **TriageAgent** | Clasifica nivel de riesgo | Menciona síntomas, malestar |
| **MedicationAgent** | Extrae y gestiona medicación | Menciona recetas, pastillas, dosis |
| **AppointmentsAgent** | Gestiona citas médicas | Menciona citas, consultas, doctores |
| **CheckinAgent** | Seguimiento diario | Responde sobre su estado |

---

## Clasificación de Riesgo

| Nivel | Score | Descripción | Acción del sistema |
|-------|-------|-------------|--------------------|
| `high` | 80-100 | Síntomas graves/urgentes | Recomendar urgencias, `OPEN_RISK_ALERT` |
| `medium` | 40-79 | Requiere atención próxima | Recomendar consulta médica |
| `low` | 10-39 | Malestar leve | Seguimiento normal |
| `none` | 0-9 | Sin síntomas relevantes | Conversación normal |

### Síntomas de alto riesgo (detección automática)

- Dolor en el pecho
- Dificultad para respirar
- Sangrado abundante inesperado
- Ideas suicidas o autolesión
- Dolor súbito e intenso
- Alteración de conciencia
- Desmayos

---

## Almacenamiento de Datos

Los datos se guardan en archivos JSON en `data/`, organizados por número de teléfono:

```
data/
├── patients/56912345678.json      # Perfil de paciente
├── conversations/56912345678.json # Historial de conversación
├── medications/56912345678.json   # Medicación activa
├── appointments/56912345678.json  # Citas médicas
└── symptoms/56912345678.json      # Historial de síntomas
```

### Ventana de contexto

- Máximo **20 mensajes** en memoria activa
- Estimación de ~**8000 tokens** por conversación
- Los datos antiguos se mantienen en disco

---

## Integración con WhatsApp

Ver `packages/whatsapp/README.md` para instrucciones detalladas.

### Ejemplo básico

```python
# En tu webhook de WhatsApp
import sys
sys.path.insert(0, "packages/agent")

from pausiva_agent import PausivaOrchestrator

pausiva = PausivaOrchestrator(storage_path="data")

def handle_whatsapp_message(phone: str, message: str):
    response = pausiva.process_message(phone, message)
    
    # Enviar respuesta
    send_whatsapp_message(phone, response.reply_text)
    
    # Manejar acciones
    if "OPEN_RISK_ALERT" in response.actions:
        notify_emergency_contact(phone, response)
    
    if "SCHEDULE_MED_REMINDERS" in response.actions:
        schedule_medication_cron(phone, response.medication_schedule)
    
    return response.to_dict()
```

---

## Cron Jobs Sugeridos

### Check-in matutino (8:00 AM)

```python
from pausiva_agent import PausivaOrchestrator

pausiva = PausivaOrchestrator(storage_path="data")

# Obtener pacientes activas
active_patients = get_active_patients()

for phone in active_patients:
    response = pausiva.send_checkin(phone)
    send_whatsapp_message(phone, response.reply_text)
```

### Recordatorios de medicación

```python
# El backend debe implementar el cron según medication_schedule
# Ejemplo: times_of_day: ["08:00", "20:00"]
```

---

## Personalización

### Cambiar prompts del sistema

Edita `packages/agent/pausiva_agent/agents/prompts/system.py`:

```python
BASE_SYSTEM_PROMPT = """Tu prompt personalizado..."""
TRIAGE_PROMPT = """Instrucciones de triaje..."""
```

### Agregar respuestas predefinidas

Edita `packages/agent/pausiva_agent/agents/prompts/templates.py`:

```python
class ResponseTemplates:
    WELCOME_NEW = """Tu bienvenida personalizada..."""
    HIGH_RISK_ALERT = """Tu mensaje de emergencia..."""
```

### Cambiar modelo de IA

En `packages/agent/pausiva_agent/agents/base.py`:

```python
class BaseAgent:
    def __init__(self, model: str = "gemini-2.5-flash"):
        # Cambiar a otro modelo de Gemini
        pass
```

---

## Variables de Entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `GOOGLE_API_KEY` | API Key de Google AI Studio | Sí |

---

## Limitaciones

- No reemplaza atención médica profesional
- No diagnostica ni prescribe medicación
- Requiere conexión a internet para la IA
- Almacenamiento local en JSON (considerar migrar a DB para producción)

---

## Desarrollo

### Estructura de paquetes

```bash
# Instalar en modo desarrollo
cd packages/agent
pip install -e .
```

### Testing

```bash
# Test con mensaje único
python scripts/test_api.py -p "+56900000001" -m "Hola"

# Reset y test
python scripts/test_api.py -p "+56900000001" --reset
python scripts/test_api.py -p "+56900000001" -m "Hola"
```

---

## Licencia

MIT License

---

## Soporte

Para dudas o problemas, crear un issue en el repositorio.
