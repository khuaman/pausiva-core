#!/bin/bash

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

# Default to following all logs
SERVICE=${1:-""}
FOLLOW=${2:-"-f"}

if [ -n "$SERVICE" ]; then
    echo "📋 Showing logs for: $SERVICE"
    docker compose -f docker-compose.prod.yml logs $FOLLOW $SERVICE
else
    echo "📋 Showing logs for all services (Ctrl+C to exit)"
    docker compose -f docker-compose.prod.yml logs $FOLLOW
fi

