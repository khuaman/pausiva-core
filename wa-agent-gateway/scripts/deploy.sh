#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo -e "${GREEN}🚀 WhatsApp Service - Deploy Script${NC}"
echo "====================================="

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo "Create one from the example: cp .env.example .env"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker is not running!${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Pulling latest changes...${NC}"
git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || echo "Skipping git pull"

echo -e "${YELLOW}🔨 Building containers...${NC}"
docker compose -f docker-compose.prod.yml build --no-cache

echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker compose -f docker-compose.prod.yml down --remove-orphans

echo -e "${YELLOW}🚀 Starting containers...${NC}"
docker compose -f docker-compose.prod.yml up -d

# Wait for services to be healthy
echo -e "${YELLOW}⏳ Waiting for services to be healthy...${NC}"
sleep 5

# Check if services are running
if docker compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo ""
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    echo ""
    echo "Services status:"
    docker compose -f docker-compose.prod.yml ps
    echo ""
    echo "View logs: ./scripts/logs.sh"
    echo "Stop services: docker compose -f docker-compose.prod.yml down"
else
    echo -e "${RED}❌ Deployment failed! Check logs:${NC}"
    docker compose -f docker-compose.prod.yml logs
    exit 1
fi

