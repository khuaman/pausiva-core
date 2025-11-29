#!/usr/bin/env python3
"""
Servidor HTTP para Pausiva API.

Uso:
    python server.py [puerto]
    
Endpoints:
    POST /message         - Enviar mensaje
    POST /checkin         - Check-in proactivo
    GET  /context/<phone> - Ver contexto
    DELETE /patient/<phone> - Reset paciente
    GET  /storage/status  - Estado del almacenamiento
    GET  /health          - Health check
    GET  /docs            - Swagger UI
    GET  /openapi.yaml    - Especificación OpenAPI
"""
import sys
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
from pathlib import Path

# Agregar el path del paquete agent
agent_path = Path(__file__).parent.parent.parent / "packages" / "agent"
sys.path.insert(0, str(agent_path))

from pausiva_agent import PausivaOrchestrator

# Rutas
ROOT_PATH = Path(__file__).parent.parent.parent
DATA_PATH = ROOT_PATH / "data"
DOCS_PATH = ROOT_PATH / "docs"

# Instancia global del orquestador
pausiva = PausivaOrchestrator(storage_path=str(DATA_PATH))

# HTML para Swagger UI
SWAGGER_HTML = """
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pausiva API - Documentación</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css">
    <style>
        body { margin: 0; padding: 0; }
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info .title { font-size: 2em; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
    <script>
        window.onload = function() {
            SwaggerUIBundle({
                url: "/openapi.yaml",
                dom_id: '#swagger-ui',
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIBundle.SwaggerUIStandalonePreset
                ],
                layout: "BaseLayout",
                deepLinking: true,
                showExtensions: true,
                showCommonExtensions: true
            });
        };
    </script>
</body>
</html>
"""


class PausivaHandler(BaseHTTPRequestHandler):
    """Handler HTTP para la API de Pausiva."""
    
    def _send_json(self, data: dict, status: int = 200):
        """Envía una respuesta JSON."""
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))
    
    def _send_html(self, html: str, status: int = 200):
        """Envía una respuesta HTML."""
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(html.encode("utf-8"))
    
    def _send_yaml(self, content: str, status: int = 200):
        """Envía una respuesta YAML."""
        self.send_response(status)
        self.send_header("Content-Type", "application/x-yaml; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(content.encode("utf-8"))
    
    def _read_body(self) -> dict:
        """Lee el body de la request como JSON."""
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            return {}
        body = self.rfile.read(content_length)
        return json.loads(body.decode("utf-8"))
    
    def do_OPTIONS(self):
        """Handle CORS preflight."""
        self._send_json({})
    
    def do_GET(self):
        """Handle GET requests."""
        parsed = urlparse(self.path)
        path_parts = parsed.path.strip("/").split("/")
        
        # GET /health
        if parsed.path == "/health":
            self._send_json({"status": "ok", "service": "pausiva-api"})
            return
        
        # GET /docs - Swagger UI
        if parsed.path == "/docs" or parsed.path == "/docs/":
            self._send_html(SWAGGER_HTML)
            return
        
        # GET /openapi.yaml - Especificación OpenAPI
        if parsed.path == "/openapi.yaml":
            openapi_file = DOCS_PATH / "openapi.yaml"
            if openapi_file.exists():
                with open(openapi_file, "r", encoding="utf-8") as f:
                    self._send_yaml(f.read())
            else:
                self._send_json({"error": "OpenAPI spec not found"}, 404)
            return
        
        # GET / - Redirect a docs
        if parsed.path == "/" or parsed.path == "":
            self.send_response(302)
            self.send_header("Location", "/docs")
            self.end_headers()
            return
        
        # GET /context/<phone>
        if len(path_parts) == 2 and path_parts[0] == "context":
            phone = path_parts[1]
            try:
                context = pausiva.get_patient_context(phone)
                self._send_json(context.get_context_summary())
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            return
        
        # GET /storage/status
        if parsed.path == "/storage/status":
            self._send_json(self._get_storage_status())
            return
        
        self._send_json({"error": "Not found"}, 404)
    
    def _get_storage_status(self) -> dict:
        """Retorna el estado del almacenamiento."""
        import os
        supabase_url = os.environ.get("SUPABASE_URL", "")
        supabase_key = os.environ.get("SUPABASE_SERVICE_KEY", "")
        
        is_configured = bool(supabase_url and supabase_key)
        
        # Ocultar parcialmente la URL si existe
        masked_url = ""
        if supabase_url:
            parts = supabase_url.split(".")
            if len(parts) >= 2:
                masked_url = f"{parts[0][:12]}...{parts[-1]}"
        
        return {
            "mode": "supabase" if is_configured else "json",
            "supabase_configured": is_configured,
            "supabase_url": masked_url if masked_url else None
        }
    
    def do_POST(self):
        """Handle POST requests."""
        parsed = urlparse(self.path)
        
        # POST /message
        if parsed.path == "/message":
            try:
                body = self._read_body()
                phone = body.get("phone")
                message = body.get("message")
                
                if not phone or not message:
                    self._send_json({"error": "phone and message are required"}, 400)
                    return
                
                response = pausiva.process_message(phone, message)
                self._send_json(response.to_dict())
                
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            return
        
        # POST /checkin
        if parsed.path == "/checkin":
            try:
                body = self._read_body()
                phone = body.get("phone")
                
                if not phone:
                    self._send_json({"error": "phone is required"}, 400)
                    return
                
                response = pausiva.send_checkin(phone)
                self._send_json(response.to_dict())
                
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            return
        
        self._send_json({"error": "Not found"}, 404)
    
    def do_DELETE(self):
        """Handle DELETE requests."""
        parsed = urlparse(self.path)
        path_parts = parsed.path.strip("/").split("/")
        
        # DELETE /patient/<phone>
        if len(path_parts) == 2 and path_parts[0] == "patient":
            phone = path_parts[1]
            try:
                result = self._reset_patient(phone)
                self._send_json(result)
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
            return
        
        self._send_json({"error": "Not found"}, 404)
    
    def _reset_patient(self, phone: str) -> dict:
        """Elimina todos los datos de una paciente."""
        phone_clean = phone.replace("+", "").replace(" ", "").replace("-", "")
        
        directories = ["patients", "conversations", "medications", "appointments", "symptoms"]
        deleted = []
        
        for dir_name in directories:
            file_path = DATA_PATH / dir_name / f"{phone_clean}.json"
            if file_path.exists():
                file_path.unlink()
                deleted.append(str(file_path))
        
        # Limpiar caché
        if phone in pausiva._patient_contexts:
            del pausiva._patient_contexts[phone]
        
        return {"status": "ok", "deleted_files": deleted}
    
    def log_message(self, format, *args):
        """Log de requests."""
        print(f"[{self.log_date_time_string()}] {args[0]}")


def run_server(port: int = 8080):
    """Inicia el servidor HTTP."""
    server = HTTPServer(("0.0.0.0", port), PausivaHandler)
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║                    PAUSIVA API SERVER                        ║
╠══════════════════════════════════════════════════════════════╣
║  Servidor:     http://localhost:{port}                         ║
║  Swagger UI:   http://localhost:{port}/docs                    ║
║  OpenAPI Spec: http://localhost:{port}/openapi.yaml            ║
╠══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                  ║
║    POST   /message         - Procesar mensaje                ║
║    POST   /checkin         - Check-in proactivo              ║
║    GET    /context/<phone> - Ver contexto de paciente        ║
║    DELETE /patient/<phone> - Eliminar datos (testing)        ║
║    GET    /storage/status  - Estado del almacenamiento       ║
║    GET    /health          - Health check                    ║
║    GET    /docs            - Documentación Swagger           ║
╠══════════════════════════════════════════════════════════════╣
║  Ejemplo:                                                    ║
║  curl -X POST http://localhost:{port}/message \\               ║
║    -H "Content-Type: application/json" \\                     ║
║    -d '{{"phone": "+56912345678", "message": "Hola"}}'        ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")
        server.shutdown()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    run_server(port)
