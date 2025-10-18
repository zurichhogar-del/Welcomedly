#!/bin/bash

# Script de pruebas para FASE 4: Sistema de Disposiciones y Callbacks

echo "🧪 INICIANDO PRUEBAS FASE 4"
echo "================================"
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador de pruebas
PASSED=0
FAILED=0

# Función para test
test_endpoint() {
    local test_name=$1
    local url=$2
    local expected_status=$3
    local method=${4:-GET}
    local data=${5:-}

    echo -n "  Testing: $test_name... "

    if [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
            -H "Content-Type: application/x-www-form-urlencoded" \
            -d "$data" \
            --cookie-jar /tmp/cookies.txt \
            --cookie /tmp/cookies.txt)
    else
        response=$(curl -s -w "\n%{http_code}" "$url" \
            --cookie-jar /tmp/cookies.txt \
            --cookie /tmp/cookies.txt)
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $expected_status, got $http_code)"
        ((FAILED++))
        return 1
    fi
}

echo "📋 1. PRUEBAS DE AUTENTICACIÓN"
echo "--------------------------------"

# Login
test_endpoint "Login con credenciales válidas" \
    "http://localhost:3000/auth/login" \
    "302" \
    "POST" \
    "correo=admin@test.com&contrasena=admin123"

sleep 1

echo ""
echo "📊 2. PRUEBAS DE API DE DISPOSICIONES"
echo "--------------------------------"

# API endpoints
test_endpoint "GET /disposiciones/api/activas" \
    "http://localhost:3000/disposiciones/api/activas" \
    "200"

test_endpoint "GET /disposiciones/api/stats" \
    "http://localhost:3000/disposiciones/api/stats" \
    "200"

echo ""
echo "🏷️  3. PRUEBAS DE VISTAS DE DISPOSICIONES"
echo "--------------------------------"

test_endpoint "GET /disposiciones/lista" \
    "http://localhost:3000/disposiciones/lista" \
    "200"

test_endpoint "GET /disposiciones/crear" \
    "http://localhost:3000/disposiciones/crear" \
    "200"

# Verificar que existe disposición con ID 1
test_endpoint "GET /disposiciones/editar/1" \
    "http://localhost:3000/disposiciones/editar/1" \
    "200"

echo ""
echo "📢 4. PRUEBAS DE INTEGRACIÓN CON CAMPAÑAS"
echo "--------------------------------"

test_endpoint "GET /campaign/campanas" \
    "http://localhost:3000/campaign/campanas" \
    "200"

test_endpoint "GET /campaign/campanas/1/ver-base" \
    "http://localhost:3000/campaign/campanas/1/ver-base" \
    "200"

test_endpoint "GET /campaign/campanas/1/gestionar/4" \
    "http://localhost:3000/campaign/campanas/1/gestionar/4" \
    "200"

echo ""
echo "🔍 5. VALIDACIONES EN BASE DE DATOS"
echo "--------------------------------"

echo -n "  Verificando disposiciones en BD... "
COUNT=$(psql -U postgres -d miappdb -t -c "SELECT COUNT(*) FROM disposiciones;" 2>/dev/null | xargs)
if [ "$COUNT" = "15" ]; then
    echo -e "${GREEN}✓ PASS${NC} ($COUNT disposiciones)"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} (Se esperaban 15, encontradas $COUNT)"
    ((FAILED++))
fi

echo -n "  Verificando campaña de prueba... "
COUNT=$(psql -U postgres -d miappdb -t -c "SELECT COUNT(*) FROM campanas WHERE id=1;" 2>/dev/null | xargs)
if [ "$COUNT" = "1" ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC}"
    ((FAILED++))
fi

echo -n "  Verificando registros con disposición... "
COUNT=$(psql -U postgres -d miappdb -t -c "SELECT COUNT(*) FROM base_campanas WHERE disposicion_id IS NOT NULL;" 2>/dev/null | xargs)
if [ "$COUNT" = "3" ]; then
    echo -e "${GREEN}✓ PASS${NC} ($COUNT registros gestionados)"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} (Se esperaban 3, encontrados $COUNT)"
    ((FAILED++))
fi

echo -n "  Verificando callbacks agendados... "
COUNT=$(psql -U postgres -d miappdb -t -c "SELECT COUNT(*) FROM base_campanas WHERE callback_date IS NOT NULL;" 2>/dev/null | xargs)
if [ "$COUNT" = "1" ]; then
    echo -e "${GREEN}✓ PASS${NC} ($COUNT callback)"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} (Se esperaba 1, encontrados $COUNT)"
    ((FAILED++))
fi

echo -n "  Verificando tipos de disposición... "
TIPOS=$(psql -U postgres -d miappdb -t -c "SELECT COUNT(DISTINCT tipo) FROM disposiciones;" 2>/dev/null | xargs)
if [ "$TIPOS" = "4" ]; then
    echo -e "${GREEN}✓ PASS${NC} (4 tipos: EXITOSA, NO_CONTACTO, SEGUIMIENTO, NO_EXITOSA)"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} (Se esperaban 4 tipos, encontrados $TIPOS)"
    ((FAILED++))
fi

echo -n "  Verificando disposiciones con callback... "
COUNT=$(psql -U postgres -d miappdb -t -c "SELECT COUNT(*) FROM disposiciones WHERE requiere_callback = true;" 2>/dev/null | xargs)
if [ "$COUNT" = "4" ]; then
    echo -e "${GREEN}✓ PASS${NC} ($COUNT disposiciones requieren callback)"
    ((PASSED++))
else
    echo -e "${RED}✗ FAIL${NC} (Se esperaban 4, encontradas $COUNT)"
    ((FAILED++))
fi

echo ""
echo "📈 6. ESTRUCTURA DE DATOS"
echo "--------------------------------"

echo "  Disposiciones por tipo:"
psql -U postgres -d miappdb -c "SELECT tipo, COUNT(*) as cantidad FROM disposiciones GROUP BY tipo ORDER BY tipo;" 2>/dev/null | grep -E "EXITOSA|NO_CONTACTO|SEGUIMIENTO|NO_EXITOSA" | while read line; do
    echo "    $line"
done

echo ""
echo "  Registros gestionados:"
psql -U postgres -d miappdb -c "SELECT bc.nombre, d.nombre as disposicion, bc.callback_date IS NOT NULL as tiene_callback FROM base_campanas bc LEFT JOIN disposiciones d ON bc.disposicion_id = d.id WHERE bc.disposicion_id IS NOT NULL;" 2>/dev/null | tail -n +3 | head -n 3

echo ""
echo "================================"
echo "📊 RESUMEN DE PRUEBAS"
echo "================================"
echo -e "${GREEN}✓ Pasadas:${NC} $PASSED"
echo -e "${RED}✗ Fallidas:${NC} $FAILED"
TOTAL=$((PASSED + FAILED))
echo "  Total: $TOTAL"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 ¡TODAS LAS PRUEBAS PASARON!${NC}"
    echo -e "${GREEN}✅ FASE 4 VALIDADA EXITOSAMENTE${NC}"
    exit 0
else
    echo ""
    echo -e "${YELLOW}⚠️  Algunas pruebas fallaron${NC}"
    echo "Por favor, revisa los errores arriba"
    exit 1
fi

# Cleanup
rm -f /tmp/cookies.txt
