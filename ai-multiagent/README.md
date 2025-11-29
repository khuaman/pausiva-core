# Pausiva AI Multiagent

Sistema multiagente de acompañamiento para mujeres de 40 a 60 años, construido con FastAPI y LangGraph.

## Estructura

```
app/
├── main.py                    # FastAPI application
├── api.py                     # Router aggregation
├── lifespan.py               # App lifecycle
│
├── chat/                      # Chat domain
│   ├── router.py             # API endpoints
│   ├── schemas.py            # Request/response models
│   ├── service.py            # Business logic
│   ├── orchestrator.py       # LangGraph orchestrator
│   │
│   ├── core/                 # Core components
│   │   ├── schemas.py        # State schemas
│   │   ├── types.py          # Enums
│   │   └── prompts.py        # System prompts
│   │
│   └── agents/               # Specialized agents
│       ├── triage.py         # Risk classification
│       ├── medication.py     # Medication reminders
│       ├── appointments.py   # Appointment management
│       └── checkin.py        # Daily wellness check-in
│
├── shared/                    # Shared utilities
│   ├── config/
│   │   └── settings.py       # Pydantic Settings
│   ├── database/
│   │   ├── client.py         # Supabase client
│   │   └── repositories.py   # Data repositories
│   └── llm/
│       └── clients.py        # LLM client factory
│
├── models/                    # Domain models
│   ├── patient.py
│   ├── medication.py
│   ├── appointment.py
│   ├── message.py
│   └── response.py
│
└── health/
    └── router.py              # Health check endpoint
```

## Setup

1. Install dependencies:

```bash
uv sync
```

2. Create `.env` file:

```env
ENVIRONMENT=local
GOOGLE_API_KEY=your_google_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_key
```

3. Run the server:

```bash
uv run fastapi dev app/main.py
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/chat/message` | Process a patient message |
| POST | `/chat/checkin` | Send proactive check-in |
| GET | `/chat/context/{phone}` | Get patient context |
| GET | `/chat/storage/status` | Get storage status |
| GET | `/health` | Health check |

## LangGraph Development

Run LangGraph studio for visual debugging:

```bash
uv run langgraph dev
```

## Architecture

The system uses a LangGraph-based orchestrator that routes messages to specialized agents:

- **Triage Agent**: Classifies risk level of symptoms
- **Medication Agent**: Manages medication reminders
- **Appointments Agent**: Handles appointment scheduling
- **Checkin Agent**: Daily wellness tracking

Messages are classified and routed based on keywords and context, with high-risk messages always prioritized to the triage agent.

