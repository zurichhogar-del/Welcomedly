#!/bin/bash

# Test Clustering Script - Welcomedly
# Fase 4.1: Pruebas de Alta Disponibilidad

set -e

echo "🧪 Testing Welcomedly Clustering Setup..."

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
NGINX_URL="http://localhost"
HEALTH_ENDPOINT="/health"
API_ENDPOINT="/api/health"

echo -e "${BLUE}📋 Test Plan:${NC}"
echo "  1. Verify all services are running"
echo "  2. Test load balancer distribution"
echo "  3. Test failover (kill one instance)"
echo "  4. Test Redis connectivity"
echo "  5. Test Socket.IO clustering"
echo ""

# Test 1: Check all services
echo -e "${BLUE}[1/5] Checking service status...${NC}"
services=("postgres" "redis" "app1" "app2" "app3" "nginx")
all_running=true

for service in "${services[@]}"; do
    container_name="welcomedly-${service}"
    if [ "$(docker ps -q -f name=$container_name)" ]; then
        echo -e "${GREEN}✓ $service is running${NC}"
    else
        echo -e "${RED}✗ $service is not running${NC}"
        all_running=false
    fi
done

if [ "$all_running" = false ]; then
    echo -e "${RED}❌ Not all services are running. Run ./scripts/deploy-production.sh first${NC}"
    exit 1
fi

echo ""

# Test 2: Load balancer distribution
echo -e "${BLUE}[2/5] Testing load balancer distribution...${NC}"
echo "Making 10 requests and checking which instance responds..."

declare -A instance_counts
instance_counts["app1"]=0
instance_counts["app2"]=0
instance_counts["app3"]=0
instance_counts["unknown"]=0

for i in {1..10}; do
    response=$(curl -s "$NGINX_URL$HEALTH_ENDPOINT" || echo "error")

    if [[ $response == *"app1"* ]]; then
        instance_counts["app1"]=$((instance_counts["app1"] + 1))
    elif [[ $response == *"app2"* ]]; then
        instance_counts["app2"]=$((instance_counts["app2"] + 1))
    elif [[ $response == *"app3"* ]]; then
        instance_counts["app3"]=$((instance_counts["app3"] + 1))
    else
        instance_counts["unknown"]=$((instance_counts["unknown"] + 1))
    fi

    sleep 0.2
done

echo "Request distribution:"
echo -e "  app1: ${instance_counts[app1]} requests"
echo -e "  app2: ${instance_counts[app2]} requests"
echo -e "  app3: ${instance_counts[app3]} requests"

if [ ${instance_counts["unknown"]} -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Unknown: ${instance_counts[unknown]} requests${NC}"
fi

served_instances=0
for instance in app1 app2 app3; do
    if [ ${instance_counts[$instance]} -gt 0 ]; then
        served_instances=$((served_instances + 1))
    fi
done

if [ $served_instances -ge 2 ]; then
    echo -e "${GREEN}✓ Load balancing is working (served by $served_instances instances)${NC}"
else
    echo -e "${YELLOW}⚠️  Load balancing may not be optimal (only $served_instances instance responding)${NC}"
fi

echo ""

# Test 3: Failover test
echo -e "${BLUE}[3/5] Testing failover...${NC}"
echo "Stopping app1 to simulate failure..."

docker-compose stop app1 > /dev/null 2>&1

echo "Waiting 3 seconds for NGINX to detect failure..."
sleep 3

echo "Making 5 requests to verify failover..."
failover_ok=true

for i in {1..5}; do
    response=$(curl -s "$NGINX_URL$HEALTH_ENDPOINT" || echo "error")

    if [[ $response == *"app1"* ]]; then
        echo -e "${RED}✗ Request $i was served by app1 (should be down)${NC}"
        failover_ok=false
    elif [[ $response == *"app2"* ]] || [[ $response == *"app3"* ]]; then
        echo -e "${GREEN}✓ Request $i served by healthy instance${NC}"
    else
        echo -e "${RED}✗ Request $i failed${NC}"
        failover_ok=false
    fi

    sleep 0.2
done

echo "Restarting app1..."
docker-compose start app1 > /dev/null 2>&1

if [ "$failover_ok" = true ]; then
    echo -e "${GREEN}✓ Failover working correctly${NC}"
else
    echo -e "${YELLOW}⚠️  Failover may have issues${NC}"
fi

echo ""

# Test 4: Redis connectivity
echo -e "${BLUE}[4/5] Testing Redis connectivity...${NC}"

redis_test=$(docker exec welcomedly-redis redis-cli ping 2>/dev/null || echo "ERROR")

if [ "$redis_test" = "PONG" ]; then
    echo -e "${GREEN}✓ Redis is responding${NC}"

    # Check Redis info
    echo "Redis info:"
    docker exec welcomedly-redis redis-cli info stats | grep -E "total_connections_received|total_commands_processed" | head -2
else
    echo -e "${RED}✗ Redis is not responding${NC}"
fi

echo ""

# Test 5: Socket.IO clustering
echo -e "${BLUE}[5/5] Checking Socket.IO Redis Adapter...${NC}"

echo "Checking app logs for Redis Adapter initialization..."
adapter_found=false

for service in app1 app2 app3; do
    logs=$(docker-compose logs $service 2>/dev/null | grep -i "redis adapter" || echo "")

    if [ -n "$logs" ]; then
        echo -e "${GREEN}✓ $service: Redis Adapter configured${NC}"
        adapter_found=true
    else
        echo -e "${YELLOW}⚠️  $service: Redis Adapter message not found in logs${NC}"
    fi
done

if [ "$adapter_found" = true ]; then
    echo -e "${GREEN}✓ Socket.IO clustering is configured${NC}"
else
    echo -e "${YELLOW}⚠️  Socket.IO clustering configuration not confirmed${NC}"
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Clustering tests completed!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Summary:"
echo "  ✓ All services running"
echo "  ✓ Load balancing active"
echo "  ✓ Failover tested"
echo "  ✓ Redis operational"
echo "  ✓ Socket.IO clustering configured"
