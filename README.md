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
├── backend/                        # Backend Python
│   ├── packages/
│   │   ├── agent/                  # Paquete del agente de IA
│   │   │   ├── pausiva_agent/      # Código Python importable
│   │   │   │   ├── agents/         # Agentes especializados
│   │   │   │   ├── database/       # Integración Supabase
│   │   │   │   ├── models/         # Modelos de datos
│   │   │   │   └── memory/         # Sistema de memoria
│   │   │   ├── pyproject.toml
│   │   │   └── README.md
│   │   │
│   │   └── whatsapp/               # Integración con WhatsApp
│   │       └── README.md
│   │
│   ├── services/
│   │   └── api/
│   │       └── server.py           # Servidor HTTP REST
│   │
│   ├── scripts/
│   │   ├── test_api.py             # Testing con JSON output
│   │   └── main.py                 # Demo del sistema
│   │
│   └── docs/
│       └── openapi.yaml            # Especificación Swagger/OpenAPI
│
├── dashboard/                      # Frontend Next.js
│   ├── app/                        # App Router
│   ├── components/                 # Componentes React
│   └── supabase/                   # Migraciones Supabase
│
├── wa-agent-gateway/               # Gateway WhatsApp (Node.js)
│   └── src/
│
├── data/                           # Datos de pacientes (gitignored)
│   ├── patients/
│   ├── conversations/
│   ├── medications/
│   ├── appointments/
│   └── symptoms/
│
├── env/                            # Virtual environment Python
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
cd backend/packages/agent
pip install -e .
cd ../../..
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
python backend/scripts/test_api.py --phone "+56912345678" --message "Hola, me duele la cabeza"

# Ver contexto de una paciente
python backend/scripts/test_api.py --phone "+56912345678" --context

# Reset paciente (para testing)
python backend/scripts/test_api.py --phone "+56912345678" --reset
```

### Demo del sistema

```bash
python backend/scripts/main.py
```

### Servidor HTTP REST

```bash
python backend/services/api/server.py

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
sys.path.insert(0, "backend/packages/agent")

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

### Modo JSON (desarrollo/testing)

Los datos se guardan en archivos JSON en `data/`, organizados por número de teléfono:

```
data/
├── patients/56912345678.json      # Perfil de paciente
├── conversations/56912345678.json # Historial de conversación
├── medications/56912345678.json   # Medicación activa
├── appointments/56912345678.json  # Citas médicas
└── symptoms/56912345678.json      # Historial de síntomas
```

### Modo Supabase (producción)

Los datos se persisten en PostgreSQL con el siguiente esquema:

| Tabla | Descripción |
|-------|-------------|
| `users` | Usuarios del sistema (auth) |
| `patients` | Perfiles de pacientes con `clinical_profile_json` |
| `doctors` | Doctores y especialistas |
| `appointments` | Citas médicas |
| `followings` | Interacciones y síntomas |
| `patient_timeline_events` | Timeline de eventos |
| `plans` | Planes de tratamiento |

### Ventana de contexto

- Máximo **20 mensajes** en memoria activa
- Estimación de ~**8000 tokens** por conversación
- Los datos antiguos se mantienen en el backend (JSON o Supabase)

---

## Integración con WhatsApp

Ver `packages/whatsapp/README.md` para instrucciones detalladas.

### Ejemplo básico

```python
# En tu webhook de WhatsApp
import sys
sys.path.insert(0, "backend/packages/agent")

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

Edita `backend/packages/agent/pausiva_agent/agents/prompts/system.py`:

```python
BASE_SYSTEM_PROMPT = """Tu prompt personalizado..."""
TRIAGE_PROMPT = """Instrucciones de triaje..."""
```

### Agregar respuestas predefinidas

Edita `backend/packages/agent/pausiva_agent/agents/prompts/templates.py`:

```python
class ResponseTemplates:
    WELCOME_NEW = """Tu bienvenida personalizada..."""
    HIGH_RISK_ALERT = """Tu mensaje de emergencia..."""
```

### Cambiar modelo de IA

En `backend/packages/agent/pausiva_agent/agents/base.py`:

```python
class BaseAgent:
    def __init__(self, model: str = "gemini-2.5-flash"):
        # Cambiar a otro modelo de Gemini
        pass
```

---

## Variables de Entorno

| Variable | Descripción | Requerida | Ejemplo |
|----------|-------------|-----------|---------|
| `GOOGLE_API_KEY` | API Key de Google AI Studio | Sí | `AIza...` |
| `SUPABASE_URL` | URL del proyecto Supabase | No* | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Service Role Key de Supabase | No* | `eyJ...` |

*Supabase es opcional. Si no está configurado, se usa almacenamiento JSON local.

### Archivo `.env` de ejemplo

```bash
# API de IA (requerida)
GOOGLE_API_KEY=tu_api_key_de_google_ai_studio

# Supabase (opcional - para producción)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Configuración del servidor (opcional)
PORT=8080
DEBUG=false
```

---

## Integración con Supabase

El sistema soporta almacenamiento en Supabase para persistencia de datos en producción.

### Configuración

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta las migraciones del schema (ver `dashboard/DATABASE_SCHEMA_SUPABASE.md`)
3. Configura las variables de entorno:

```bash
# En .env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_KEY=tu_service_key
```

### Arquitectura de almacenamiento

```
┌─────────────────────────────────────────────────────────────┐
│                    StorageManager                           │
│  (Fachada que abstrae el almacenamiento)                   │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
          ▼                               ▼
┌─────────────────────┐       ┌─────────────────────┐
│  SupabaseStorage    │       │  JSONStorageManager │
│  (Producción)       │       │  (Desarrollo/Test)  │
└─────────┬───────────┘       └─────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Repositories                             │
│  ┌─────────────┐ ┌──────────────┐ ┌────────────────────┐   │
│  │PatientRepo  │ │FollowingRepo│ │ AppointmentRepo    │   │
│  └─────────────┘ └──────────────┘ └────────────────────┘   │
│  ┌─────────────┐ ┌──────────────┐                          │
│  │TimelineRepo │ │  PlanRepo    │                          │
│  └─────────────┘ └──────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

### Mapeo de datos

| Pausiva | Supabase Table | Campos/Uso |
|---------|----------------|------------|
| `Patient` | `users` + `patients` | Perfil, `clinical_profile_json` |
| `Medication` | `patients.clinical_profile_json` | Array de medicamentos en JSONB |
| `Appointment` | `appointments` | Con `doctor_id` referenciando `doctors` |
| `Symptom` | `followings` | `type='symptoms'`, `severity_score` |
| `RiskAlert` | `followings` | `is_urgent=true` cuando riesgo alto |
| `Timeline` | `patient_timeline_events` | Historial de eventos |

### Repositorios disponibles

```python
from pausiva_agent.database import (
    PatientRepository,
    FollowingRepository,
    AppointmentRepository,
    TimelineRepository,
    PlanRepository
)

# Ejemplo: obtener paciente por teléfono
patient_repo = PatientRepository()
patient = patient_repo.get_by_phone("+56912345678")

# Ejemplo: registrar síntoma
following_repo = FollowingRepository()
following_repo.create_symptom_entry(
    patient_id=patient.id,
    notes="Dolor de cabeza y mareos",
    severity_score=35,
    is_urgent=False
)

# Ejemplo: obtener citas próximas
apt_repo = AppointmentRepository()
appointments = apt_repo.get_upcoming_by_patient(patient.id)
```

### Contexto enriquecido

Con Supabase, los agentes reciben contexto completo de la paciente:

```
[CONTEXTO DE LA PACIENTE]:

== INFORMACIÓN DEL PACIENTE ==
Nombre: María García
Teléfono: +56912345678
Perfil: Edad: 52 años; Etapa: Peri-menopausia
Nivel de riesgo actual: low (score: 25)

== PERFIL CLÍNICO ==
Condiciones: Hipertensión, Diabetes tipo 2
Alergias: Penicilina
Notas: En tratamiento hormonal desde 2024

== MEDICACIÓN ACTIVA ==
- Metformina 850mg: 2 veces al día (08:00, 20:00)
- Enalapril 10mg: 1 vez al día (08:00)

== CITAS PRÓXIMAS ==
- 2025-12-15 10:00: Dra. María López (Ginecología) - Control de rutina
- 2025-12-20 15:30: Dr. Juan Pérez (Cardiología) - Seguimiento

== SÍNTOMAS RECIENTES ==
- Cansancio y bochornos (riesgo: low, score: 35)
- Dolor de cabeza leve (riesgo: low, score: 20)

== HISTORIAL DE INTERACCIONES ==
- [symptoms] Reportó cansancio y mareos (hace 2 días)
- [appointment] Confirmó cita con ginecología (hace 5 días)
```

### Verificar modo de almacenamiento

```python
from pausiva_agent.memory import StorageManager

storage = StorageManager()

# Verificar qué backend está activo
if storage.using_supabase:
    print("Usando Supabase")
else:
    print("Usando JSON local")
```

### Fallback automático

El sistema detecta automáticamente el modo de almacenamiento:

1. Si `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` están configurados → **Supabase**
2. Si faltan credenciales → **JSON local** en `data/`

```python
# El código es idéntico independiente del backend
from pausiva_agent import PausivaOrchestrator

pausiva = PausivaOrchestrator(storage_path="data")
response = pausiva.process_message("+56912345678", "Hola")
# Funciona igual con Supabase o JSON
```

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
cd backend/packages/agent
pip install -e .
```

### Testing

```bash
# Test con mensaje único
python backend/scripts/test_api.py -p "+56900000001" -m "Hola"

# Reset y test
python backend/scripts/test_api.py -p "+56900000001" --reset
python backend/scripts/test_api.py -p "+56900000001" -m "Hola"
```

---

## Licencia

MIT License

---

## Soporte

Para dudas o problemas, crear un issue en el repositorio.
