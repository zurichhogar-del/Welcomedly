#!/bin/bash

# Build Production Script - Welcomedly
# Fase 4.1: Clustering y Alta Disponibilidad

set -e  # Exit on error

echo "🏗️  Building Welcomedly Production Images..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "💡 Copy .env.example to .env and configure it first"
    exit 1
fi

# Load environment variables
source .env

# Check required environment variables
REQUIRED_VARS=("DB_PASSWORD" "SESSION_SECRET")
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Error: $var is not set in .env${NC}"
        exit 1
    fi
done

echo -e "${BLUE}📦 Building Docker images...${NC}"

# Build the application image
docker-compose build --no-cache

echo -e "${GREEN}✓ Docker images built successfully${NC}"

# Show images
echo -e "${BLUE}📋 Built images:${NC}"
docker images | grep welcomedly

echo -e "${GREEN}✅ Build completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Run: ./scripts/deploy-production.sh"
echo "  2. Or manually: docker-compose up -d"
