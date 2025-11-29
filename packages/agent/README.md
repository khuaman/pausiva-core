# Pausiva Agent

Paquete del sistema multiagente de acompañamiento para Pausiva.

## Instalación

```bash
cd packages/agent
pip install -e .
```

## Uso

```python
from pausiva_agent import PausivaOrchestrator

# Inicializar
pausiva = PausivaOrchestrator(storage_path="/ruta/a/data")

# Procesar mensaje
response = pausiva.process_message(
    phone_number="+56912345678",
    message="Hola, me duele la cabeza"
)

print(response.to_dict())
```

## Estructura

```
pausiva_agent/
├── agents/           # Agentes especializados
│   ├── base.py       # Clase base
│   ├── orchestrator.py
│   ├── triage.py
│   ├── medication.py
│   ├── appointments.py
│   ├── checkin.py
│   └── prompts/      # Prompts del sistema
├── models/           # Modelos de datos
└── memory/           # Sistema de memoria
```

