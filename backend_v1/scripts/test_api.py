#!/usr/bin/env python3
"""
Script de prueba para Pausiva - Devuelve JSON puro.

Uso:
    python test_api.py --phone "+56912345678" --message "Hola"
    python test_api.py --phone "+56912345678" --context
    python test_api.py --phone "+56912345678" --reset
"""
import sys
import json
import argparse
from pathlib import Path

# Agregar el path del paquete agent
agent_path = Path(__file__).parent.parent / "packages" / "agent"
sys.path.insert(0, str(agent_path))

from pausiva_agent import PausivaOrchestrator

# Ruta de datos (data/ está en la raíz del monorepo, no en backend/)
BACKEND_PATH = Path(__file__).parent.parent
ROOT_PATH = BACKEND_PATH.parent
DATA_PATH = ROOT_PATH / "data"


def send_message(pausiva: PausivaOrchestrator, phone: str, message: str) -> dict:
    """Envía un mensaje y devuelve la respuesta como dict JSON."""
    response = pausiva.process_message(phone, message)
    return response.to_dict()


def reset_patient(phone: str):
    """Elimina todos los datos de una paciente."""
    phone_clean = phone.replace("+", "").replace(" ", "").replace("-", "")
    
    directories = ["patients", "conversations", "medications", "appointments", "symptoms"]
    deleted = []
    
    for dir_name in directories:
        file_path = DATA_PATH / dir_name / f"{phone_clean}.json"
        if file_path.exists():
            file_path.unlink()
            deleted.append(str(file_path))
    
    return {"status": "ok", "deleted_files": deleted}


def main():
    parser = argparse.ArgumentParser(description="Pausiva API Test")
    parser.add_argument("--phone", "-p", required=True, help="Número de teléfono")
    parser.add_argument("--message", "-m", help="Mensaje a enviar")
    parser.add_argument("--context", "-c", action="store_true", help="Ver contexto")
    parser.add_argument("--reset", "-r", action="store_true", help="Reset paciente")
    
    args = parser.parse_args()
    
    if args.reset:
        result = reset_patient(args.phone)
        print(json.dumps(result, ensure_ascii=False))
        return
    
    pausiva = PausivaOrchestrator(storage_path=str(DATA_PATH))
    
    if args.context:
        context = pausiva.get_patient_context(args.phone)
        print(json.dumps(context.get_context_summary(), ensure_ascii=False, indent=2))
        return
    
    if args.message:
        response = send_message(pausiva, args.phone, args.message)
        print(json.dumps(response, ensure_ascii=False, indent=2))
        return
    
    parser.print_help()


if __name__ == "__main__":
    main()
