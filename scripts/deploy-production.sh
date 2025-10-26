#!/bin/bash

# Deploy Production Script - Welcomedly
# Fase 4.1: Clustering y Alta Disponibilidad

set -e  # Exit on error

echo "🚀 Deploying Welcomedly to Production..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "💡 Copy .env.example to .env and configure it first"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Docker is not running${NC}"
    exit 1
fi

echo -e "${BLUE}🔍 Checking deployment prerequisites...${NC}"

# Stop existing containers if running
if [ "$(docker ps -q -f name=welcomedly)" ]; then
    echo -e "${YELLOW}⚠️  Stopping existing containers...${NC}"
    docker-compose down
fi

echo -e "${BLUE}🏗️  Starting services...${NC}"

# Start all services
docker-compose up -d

# Wait for services to be healthy
echo -e "${BLUE}⏳ Waiting for services to be healthy...${NC}"
sleep 10

# Check health of services
echo -e "${BLUE}🏥 Checking service health...${NC}"

services=("postgres" "redis" "app1" "app2" "app3" "nginx")
all_healthy=true

for service in "${services[@]}"; do
    container_name="welcomedly-${service}"
    if [ "$(docker ps -q -f name=$container_name -f health=healthy)" ]; then
        echo -e "${GREEN}✓ $service is healthy${NC}"
    else
        status=$(docker inspect --format='{{.State.Health.Status}}' $container_name 2>/dev/null || echo "not found")
        if [ "$status" == "not found" ]; then
            echo -e "${YELLOW}⚠ $service has no health check${NC}"
        else
            echo -e "${RED}✗ $service is $status${NC}"
            all_healthy=false
        fi
    fi
done

# Show running containers
echo ""
echo -e "${BLUE}📋 Running containers:${NC}"
docker-compose ps

# Show logs from app instances
echo ""
echo -e "${BLUE}📝 Recent logs from app instances:${NC}"
docker-compose logs --tail=5 app1 app2 app3

echo ""
if [ "$all_healthy" = true ]; then
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
    echo ""
    echo "🌐 Application is available at:"
    echo "   http://localhost"
    echo ""
    echo "📊 Services:"
    echo "   - 3 App Instances (app1, app2, app3)"
    echo "   - PostgreSQL Database"
    echo "   - Redis Cache & Socket.IO Adapter"
    echo "   - NGINX Load Balancer"
    echo ""
    echo "📝 Useful commands:"
    echo "   - View logs: docker-compose logs -f [service]"
    echo "   - Stop all: docker-compose down"
    echo "   - Restart service: docker-compose restart [service]"
    echo "   - Scale app: docker-compose up -d --scale app1=2"
else
    echo -e "${YELLOW}⚠️  Deployment completed with warnings${NC}"
    echo "Some services may not be fully healthy. Check logs with:"
    echo "   docker-compose logs -f"
fi
