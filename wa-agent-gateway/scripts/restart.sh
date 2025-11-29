#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo -e "${YELLOW}🔄 Restarting WhatsApp Service...${NC}"

docker compose -f docker-compose.prod.yml restart

echo -e "${GREEN}✅ Services restarted${NC}"
docker compose -f docker-compose.prod.yml ps

