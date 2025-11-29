# Pausiva WhatsApp Integration

Paquete para la integración con WhatsApp.

## Estructura sugerida

```
whatsapp/
├── src/
│   ├── webhook.py      # Webhook para recibir mensajes
│   ├── sender.py       # Envío de mensajes
│   └── config.py       # Configuración de WhatsApp API
├── requirements.txt
└── README.md
```

## Integración con el Agente

```python
import sys
sys.path.insert(0, "../agent")

from pausiva_agent import PausivaOrchestrator

# Inicializar
pausiva = PausivaOrchestrator(storage_path="../../data")

# Cuando llega un mensaje de WhatsApp
def handle_whatsapp_message(phone: str, message: str):
    response = pausiva.process_message(phone, message)
    
    # Enviar respuesta
    send_whatsapp_message(phone, response.reply_text)
    
    # Manejar acciones
    if "OPEN_RISK_ALERT" in response.actions:
        notify_emergency(phone, response)
    
    if "SCHEDULE_MED_REMINDERS" in response.actions:
        schedule_reminders(phone, response.medication_schedule)
    
    return response.to_dict()
```

## Acciones a manejar

| Acción | Descripción |
|--------|-------------|
| `SEND_MESSAGE` | Enviar `reply_text` por WhatsApp |
| `OPEN_RISK_ALERT` | Activar alerta de emergencia |
| `UPDATE_SYMPTOM_TRACKING` | Ya guardado automáticamente |
| `SCHEDULE_MED_REMINDERS` | Programar recordatorios de medicación |
| `SCHEDULE_APPOINTMENT_REMINDERS` | Programar recordatorios de citas |

