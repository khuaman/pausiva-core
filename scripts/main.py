#!/usr/bin/env python3
"""
Pausiva Core - Demo del sistema multiagente.
"""
import sys
import json
from pathlib import Path

# Agregar el path del paquete agent
agent_path = Path(__file__).parent.parent / "packages" / "agent"
sys.path.insert(0, str(agent_path))

from pausiva_agent import PausivaOrchestrator

# Ruta de datos
DATA_PATH = Path(__file__).parent.parent / "data"


def main():
    """Demo del sistema Pausiva."""
    pausiva = PausivaOrchestrator(storage_path=str(DATA_PATH))
    
    print("=" * 60)
    print("PAUSIVA - Sistema de Acompañamiento")
    print("=" * 60)
    
    # Paciente de prueba
    phone = "+56900000001"
    
    print(f"\n📱 Paciente: {phone}")
    print("-" * 40)
    
    # Mensaje 1: Saludo
    response = pausiva.process_message(phone, "Hola, buenos días")
    print(f"Mensaje: Hola, buenos días")
    print(f"Respuesta: {response.reply_text}")
    print(f"Agente: {response.agent_used}")
    
    # Mensaje 2: Síntomas
    response = pausiva.process_message(
        phone,
        "Me siento cansada y con dolor de cabeza"
    )
    print(f"\nMensaje: Me siento cansada y con dolor de cabeza")
    print(f"Respuesta: {response.reply_text}")
    print(f"Riesgo: {response.risk_level.value} (score: {response.risk_score})")
    print(f"Agente: {response.agent_used}")
    
    # Mostrar JSON completo
    print("\n" + "=" * 60)
    print("RESPUESTA JSON COMPLETA")
    print("=" * 60)
    print(json.dumps(response.to_dict(), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
