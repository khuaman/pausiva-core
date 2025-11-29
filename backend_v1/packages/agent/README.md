# Pausiva Agent

Paquete del sistema multiagente de acompañamiento para Pausiva.

## Características

- Sistema multiagente con routing inteligente
- Clasificación de riesgo automática
- Gestión de medicación y citas
- Check-in diario de síntomas
- **Integración con Supabase** para almacenamiento persistente

## Instalación

```bash
cd packages/agent

# Instalación básica (JSON local)
pip install -e .

# Con Supabase (recomendado)
pip install -e ".[supabase]"
```

## Configuración

### Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
# Requerido
GOOGLE_API_KEY=tu_api_key_de_gemini

# Opcional (para Supabase)
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_KEY=tu_service_key
```

### Supabase

Si configuras Supabase, el agente automáticamente:
- Guarda datos de pacientes en las tablas `users` y `patients`
- Registra interacciones en `followings`
- Lee citas desde `appointments`
- Mantiene timeline de eventos en `patient_timeline_events`

## Uso

```python
from pausiva_agent import PausivaOrchestrator

# Inicializar (detecta Supabase automáticamente)
pausiva = PausivaOrchestrator(storage_path="../../data")

# Procesar mensaje
response = pausiva.process_message(
    phone_number="+56912345678",
    message="Hola, me duele la cabeza"
)

# Respuesta JSON
print(response.to_dict())
```

## Estructura

```
pausiva_agent/
├── agents/           # Agentes especializados
│   ├── base.py       # Clase base con contexto enriquecido
│   ├── orchestrator.py
│   ├── triage.py
│   ├── medication.py
│   ├── appointments.py
│   ├── checkin.py
│   └── prompts/      # Prompts del sistema
├── models/           # Modelos de datos
├── memory/           # Sistema de memoria
│   ├── storage.py    # Almacenamiento híbrido (Supabase + JSON)
│   └── patient_context.py
└── database/         # Integración Supabase
    ├── client.py     # Cliente Supabase
    ├── repositories.py  # Repositorios por entidad
    └── supabase_storage.py
```

## Mapeo con Supabase Schema

| Pausiva Model | Supabase Table | Notas |
|---------------|----------------|-------|
| `Patient` | `users` + `patients` | Perfil y datos clínicos |
| `Medication` | `plans.plan` (JSONB) | Dentro del perfil clínico |
| `Appointment` | `appointments` | Con referencia a doctores |
| `Symptom Entry` | `followings` (type='symptoms') | Seguimiento de síntomas |
| `Conversation` | `followings` | Resumen de interacciones |

## Contexto del Agente

Con Supabase, los agentes reciben contexto enriquecido:

```
[CONTEXTO DE LA PACIENTE]:

== INFORMACIÓN DEL PACIENTE ==
Nombre: María García
Teléfono: +56912345678
Perfil: Edad: 52 años; Etapa: Peri-menopausia; Condiciones: hipertensión

== MEDICACIÓN ACTIVA ==
- Metformina: 2 veces al día
- Enalapril: 1 vez al día

== CITAS PRÓXIMAS ==
- 2025-12-15 10:00: Dra. López (Ginecología)

== SÍNTOMAS RECIENTES ==
- Dolor de cabeza leve (riesgo: low)
- Fatiga general (riesgo: low)

== INTERACCIONES RECIENTES ==
- [symptoms] Reportó cansancio y mareos leves
- [emotional] Check-in matutino, ánimo estable
```

## Fallback a JSON

Si Supabase no está configurado, el sistema automáticamente usa almacenamiento JSON local en `data/`.
