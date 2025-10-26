#!/bin/bash

# Script de Testing Sprint 2.3 - Performance Optimizations
# Tests de cache, queries optimizadas e índices

echo "════════════════════════════════════════════════════════════════"
echo "   TESTING SPRINT 2.3 - OPTIMIZACIÓN DE QUERIES Y CACHÉ"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"
PASSED=0
FAILED=0

# Función para imprimir resultado
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $2"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}❌ FAIL${NC}: $2"
        FAILED=$((FAILED + 1))
    fi
}

echo "══════════════════════════════════════════════════════════════"
echo " TEST 1: Verificar que Redis esté corriendo"
echo "══════════════════════════════════════════════════════════════"
REDIS_STATUS=$(redis-cli ping 2>/dev/null)
if [ "$REDIS_STATUS" = "PONG" ]; then
    print_result 0 "Redis está corriendo"
else
    print_result 1 "Redis NO está corriendo"
fi
echo ""

echo "══════════════════════════════════════════════════════════════"
echo " TEST 2: Verificar Health Check Endpoint (Sprint 2.2.2)"
echo "══════════════════════════════════════════════════════════════"
HEALTH_RESPONSE=$(curl -s "$BASE_URL/health")
if echo "$HEALTH_RESPONSE" | grep -q "UP"; then
    print_result 0 "Health endpoint retorna status UP"
else
    print_result 1 "Health endpoint NO retorna status UP"
fi

HEALTH_DETAILED=$(curl -s "$BASE_URL/health/detailed")
if echo "$HEALTH_DETAILED" | grep -q "redis"; then
    print_result 0 "Health detailed incluye estado de Redis"
else
    print_result 1 "Health detailed NO incluye Redis"
fi
echo ""

echo "══════════════════════════════════════════════════════════════"
echo " TEST 3: Performance de Queries - Primera Ejecución (SIN Caché)"
echo "══════════════════════════════════════════════════════════════"

# Limpiar caché de Redis antes de la prueba
redis-cli FLUSHALL > /dev/null 2>&1
echo "Caché Redis limpiado para baseline"

# Prueba 1: Primera carga de campañas (sin caché)
START1=$(date +%s%3N)
HTTP_CODE1=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/campaign/campanas")
END1=$(date +%s%3N)
TIME1=$((END1 - START1))

if [ "$HTTP_CODE1" = "200" ]; then
    print_result 0 "GET /campaign/campanas responde 200 OK (${TIME1}ms sin caché)"
else
    print_result 1 "GET /campaign/campanas respondió $HTTP_CODE1"
fi
echo ""

echo "══════════════════════════════════════════════════════════════"
echo " TEST 4: Performance de Queries - Segunda Ejecución (CON Caché)"
echo "══════════════════════════════════════════════════════════════"

# Prueba 2: Segunda carga de campañas (CON caché Redis - Sprint 2.3.1)
START2=$(date +%s%3N)
HTTP_CODE2=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/campaign/campanas")
END2=$(date +%s%3N)
TIME2=$((END2 - START2))

if [ "$HTTP_CODE2" = "200" ]; then
    print_result 0 "GET /campaign/campanas CON caché responde 200 OK (${TIME2}ms)"
else
    print_result 1 "GET /campaign/campanas CON caché respondió $HTTP_CODE2"
fi

# Verificar que la segunda ejecución sea más rápida (caché funcionando)
if [ $TIME2 -lt $TIME1 ]; then
    IMPROVEMENT=$((100 - (TIME2 * 100 / TIME1)))
    print_result 0 "Caché Redis mejora performance en ~${IMPROVEMENT}% (${TIME1}ms -> ${TIME2}ms)"
else
    print_result 1 "Caché NO mejoró performance (${TIME1}ms -> ${TIME2}ms)"
fi
echo ""

echo "══════════════════════════════════════════════════════════════"
echo " TEST 5: Verificar Índices de Base de Datos (Sprint 2.3.3)"
echo "══════════════════════════════════════════════════════════════"

# Verificar índices creados
INDICES_COUNT=$(psql -U postgres -d miappdb -t -c "
    SELECT COUNT(*) FROM pg_indexes
    WHERE indexname LIKE 'idx_%';" 2>/dev/null)

if [ "$INDICES_COUNT" -ge 7 ]; then
    print_result 0 "Se encontraron $INDICES_COUNT índices personalizados creados"
else
    print_result 1 "Solo se encontraron $INDICES_COUNT índices (esperados >= 7)"
fi

# Verificar índice GIN para JSONB
GIN_INDEX=$(psql -U postgres -d miappdb -t -c "
    SELECT COUNT(*) FROM pg_indexes
    WHERE indexname = 'idx_base_campanas_otros_campos_gin';" 2>/dev/null | xargs)

if [ "$GIN_INDEX" = "1" ]; then
    print_result 0 "Índice GIN para JSONB otros_campos existe"
else
    print_result 1 "Índice GIN para JSONB NO existe"
fi

# Verificar índice compuesto campana_id + disposicion_id
COMPOSITE_INDEX=$(psql -U postgres -d miappdb -t -c "
    SELECT COUNT(*) FROM pg_indexes
    WHERE indexname = 'idx_base_campanas_campana_disposicion';" 2>/dev/null | xargs)

if [ "$COMPOSITE_INDEX" = "1" ]; then
    print_result 0 "Índice compuesto campana_disposicion existe"
else
    print_result 1 "Índice compuesto campana_disposicion NO existe"
fi
echo ""

echo "══════════════════════════════════════════════════════════════"
echo " TEST 6: Testing de Query Optimizations (Sprint 2.3.2)"
echo "══════════════════════════════════════════════════════════════"

# Verificar que los archivos de optimización existan
if [ -f "src/utils/queryOptimization.js" ]; then
    print_result 0 "Archivo queryOptimization.js existe"
else
    print_result 1 "Archivo queryOptimization.js NO existe"
fi

# Verificar que campaignService use caché
if grep -q "cacheService.wrap" src/services/campaignService.js; then
    print_result 0 "campaignService implementa cache.wrap()"
else
    print_result 1 "campaignService NO implementa cache.wrap()"
fi

# Verificar que disposicionService use caché
if grep -q "cacheService" src/services/disposicionService.js; then
    print_result 0 "disposicionService importa cacheService"
else
    print_result 1 "disposicionService NO usa cacheService"
fi

# Verificar measureQuery en controllers
if grep -q "measureQuery" src/controllers/campaignController.js; then
    print_result 0 "campaignController usa measureQuery para performance tracking"
else
    print_result 1 "campaignController NO usa measureQuery"
fi
echo ""

echo "══════════════════════════════════════════════════════════════"
echo " TEST 7: Testing de Logging Winston (Sprint 2.2.1)"
echo "══════════════════════════════════════════════════════════════"

# Verificar que existan logs del día
TODAY=$(date +%Y-%m-%d)
if [ -f "logs/app-$TODAY.log" ]; then
    print_result 0 "Log diario app-$TODAY.log existe"

    # Verificar que contenga entries de Winston
    if grep -q "Winston Logger initialized" "logs/app-$TODAY.log"; then
        print_result 0 "Log contiene entries de Winston"
    else
        print_result 1 "Log NO contiene entries de Winston"
    fi
else
    print_result 1 "Log diario app-$TODAY.log NO existe"
fi
echo ""

echo "══════════════════════════════════════════════════════════════"
echo " TEST 8: Verificar Estadísticas de Redis"
echo "══════════════════════════════════════════════════════════════"

# Verificar claves en Redis
REDIS_KEYS=$(redis-cli DBSIZE 2>/dev/null | grep -oE '[0-9]+')
if [ "$REDIS_KEYS" -gt 0 ]; then
    print_result 0 "Redis contiene $REDIS_KEYS claves en caché"
else
    print_result 1 "Redis NO contiene claves en caché"
fi

# Verificar TTL de claves de campaña
CAMPAIGN_KEYS=$(redis-cli KEYS "cache:campaign:*" 2>/dev/null | wc -l | xargs)
if [ "$CAMPAIGN_KEYS" -gt 0 ]; then
    print_result 0 "Redis tiene $CAMPAIGN_KEYS claves de campañas en caché"
else
    print_result 1 "Redis NO tiene claves de campañas en caché"
fi
echo ""

echo "══════════════════════════════════════════════════════════════"
echo " RESUMEN FINAL"
echo "══════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Tests Passed: $PASSED${NC}"
echo -e "${RED}❌ Tests Failed: $FAILED${NC}"
TOTAL=$((PASSED + FAILED))
echo "📊 Total Tests: $TOTAL"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}════════════════════════════════════════════════════════════════"
    echo "   ✅ TODOS LOS TESTS PASARON - Sprint 2.3 COMPLETADO"
    echo "════════════════════════════════════════════════════════════${NC}"
    exit 0
else
    echo -e "${RED}════════════════════════════════════════════════════════════════"
    echo "   ❌ ALGUNOS TESTS FALLARON - Revisar implementación"
    echo "════════════════════════════════════════════════════════════${NC}"
    exit 1
fi
