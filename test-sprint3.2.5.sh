#!/bin/bash

# Test Sprint 3.2.5: Mejorar Experiencia del Softphone
# Valida las funcionalidades implementadas

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contador de tests
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# URL base
BASE_URL="http://localhost:3000"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          TEST SPRINT 3.2.5: Softphone Experience UX            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Función para imprimir resultados
print_test() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Test $TOTAL_TESTS: $2"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗${NC} Test $TOTAL_TESTS: $2"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

# Función para verificar que el servidor está corriendo
check_server() {
    echo -e "${YELLOW}Verificando servidor...${NC}"
    response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL 2>/dev/null)
    if [ "$response" = "000" ]; then
        echo -e "${RED}ERROR: El servidor no está corriendo en $BASE_URL${NC}"
        echo -e "${YELLOW}Por favor inicia el servidor con: npm run dev${NC}"
        exit 1
    fi
    echo -e "${GREEN}Servidor activo${NC}"
    echo ""
}

# Función para login y obtener cookie
login() {
    echo -e "${YELLOW}Realizando login...${NC}"

    # Intentar login con usuario de prueba
    LOGIN_RESPONSE=$(curl -s -c /tmp/cookies.txt -b /tmp/cookies.txt \
        -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        --data-raw "correo=admin@test.com&contrasena=admin123" \
        -w "\n%{http_code}" 2>/dev/null)

    HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n 1)

    if [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}Login exitoso${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}Error en login (HTTP $HTTP_CODE)${NC}"
        echo -e "${YELLOW}Nota: Asegúrate de que existe el usuario admin@test.com / admin123${NC}"
        echo ""
        return 1
    fi
}

# ============================================================================
# TEST 1: API de Lookup de Cliente por Teléfono
# ============================================================================
test_customer_lookup() {
    echo -e "${BLUE}═══ TEST 1: Customer Lookup API ═══${NC}"

    # Test con número existente (si hay datos de prueba)
    PHONE="+573001234567"
    response=$(curl -s -b /tmp/cookies.txt \
        "$BASE_URL/api/telephony/lookup/customer/$PHONE" \
        -w "\n%{http_code}")

    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)

    # Verificar que la API responde
    if [ "$http_code" = "200" ]; then
        print_test 0 "API /api/telephony/lookup/customer/:phone responde correctamente"

        # Verificar estructura JSON
        success=$(echo "$body" | grep -o '"success"' | wc -l)
        if [ $success -gt 0 ]; then
            print_test 0 "Respuesta contiene campo 'success'"
        else
            print_test 1 "Respuesta NO contiene campo 'success'"
        fi

    else
        print_test 1 "API /api/telephony/lookup/customer/:phone falló (HTTP $http_code)"
    fi

    echo ""
}

# ============================================================================
# TEST 2: API de Transferencia de Llamadas
# ============================================================================
test_call_transfer() {
    echo -e "${BLUE}═══ TEST 2: Call Transfer API ═══${NC}"

    # Test de transferencia (simulado - no hay canal activo)
    response=$(curl -s -b /tmp/cookies.txt \
        -X POST "$BASE_URL/api/telephony/call/transfer" \
        -H "Content-Type: application/json" \
        -d '{"channel":"PJSIP/test-123","targetExtension":"1002","transferType":"cold"}' \
        -w "\n%{http_code}")

    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)

    # La API debe responder (aunque falle por no haber canal)
    if [ "$http_code" = "200" ] || [ "$http_code" = "500" ]; then
        print_test 0 "API /api/telephony/call/transfer está disponible"

        # Verificar que tiene manejo de errores
        if echo "$body" | grep -q '"success"'; then
            print_test 0 "Endpoint de transferencia retorna estructura JSON válida"
        else
            print_test 1 "Endpoint de transferencia NO retorna JSON válido"
        fi
    else
        print_test 1 "API /api/telephony/call/transfer no responde (HTTP $http_code)"
    fi

    echo ""
}

# ============================================================================
# TEST 3: API de Estadísticas de Llamadas
# ============================================================================
test_call_stats() {
    echo -e "${BLUE}═══ TEST 3: Call Stats API ═══${NC}"

    # Obtener estadísticas del día
    START_DATE=$(date -u +"%Y-%m-%dT00:00:00.000Z")
    END_DATE=$(date -u +"%Y-%m-%dT23:59:59.999Z")

    response=$(curl -s -b /tmp/cookies.txt \
        "$BASE_URL/api/telephony/calls/stats?startDate=$START_DATE&endDate=$END_DATE" \
        -w "\n%{http_code}")

    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)

    if [ "$http_code" = "200" ]; then
        print_test 0 "API /api/telephony/calls/stats responde correctamente"

        # Verificar campos requeridos
        if echo "$body" | grep -q '"totalCalls"' && \
           echo "$body" | grep -q '"answered"' && \
           echo "$body" | grep -q '"answerRate"' && \
           echo "$body" | grep -q '"avgDuration"'; then
            print_test 0 "Respuesta contiene todos los campos de métricas requeridos"
        else
            print_test 1 "Respuesta NO contiene todos los campos requeridos"
        fi

        # Verificar que los valores son numéricos
        totalCalls=$(echo "$body" | grep -o '"totalCalls":[0-9]*' | grep -o '[0-9]*$')
        if [[ "$totalCalls" =~ ^[0-9]+$ ]]; then
            print_test 0 "Campo totalCalls es numérico (valor: $totalCalls)"
        else
            print_test 1 "Campo totalCalls NO es numérico"
        fi

    else
        print_test 1 "API /api/telephony/calls/stats falló (HTTP $http_code)"
    fi

    echo ""
}

# ============================================================================
# TEST 4: Archivos de Vista - Click-to-Dial
# ============================================================================
test_view_files() {
    echo -e "${BLUE}═══ TEST 4: Archivos de Vista ═══${NC}"

    # Verificar que existe la vista de campañas
    if [ -f "src/views/campaignViews/ver_base.ejs" ]; then
        print_test 0 "Vista ver_base.ejs existe"

        # Verificar que tiene el botón click-to-dial
        if grep -q "click-to-dial" "src/views/campaignViews/ver_base.ejs"; then
            print_test 0 "Vista contiene botón click-to-dial"
        else
            print_test 1 "Vista NO contiene botón click-to-dial"
        fi

        # Verificar data attributes
        if grep -q "data-phone" "src/views/campaignViews/ver_base.ejs" && \
           grep -q "data-lead-id" "src/views/campaignViews/ver_base.ejs"; then
            print_test 0 "Botón click-to-dial tiene data attributes necesarios"
        else
            print_test 1 "Botón click-to-dial NO tiene data attributes"
        fi

    else
        print_test 1 "Vista ver_base.ejs NO existe"
    fi

    echo ""
}

# ============================================================================
# TEST 5: Agent Workstation - Métricas
# ============================================================================
test_agent_workstation() {
    echo -e "${BLUE}═══ TEST 5: Agent Workstation - Métricas ═══${NC}"

    # Verificar vista de Agent Workstation
    if [ -f "src/views/agentsViews/agentWorkstation.ejs" ]; then
        print_test 0 "Vista agentWorkstation.ejs existe"

        # Verificar IDs de métricas
        if grep -q 'id="calls-count"' "src/views/agentsViews/agentWorkstation.ejs" && \
           grep -q 'id="calls-answered"' "src/views/agentsViews/agentWorkstation.ejs" && \
           grep -q 'id="answer-rate"' "src/views/agentsViews/agentWorkstation.ejs" && \
           grep -q 'id="avg-duration"' "src/views/agentsViews/agentWorkstation.ejs"; then
            print_test 0 "Vista contiene todos los IDs de métricas de llamadas"
        else
            print_test 1 "Vista NO contiene todos los IDs de métricas"
        fi

    else
        print_test 1 "Vista agentWorkstation.ejs NO existe"
    fi

    # Verificar JavaScript de Agent Workstation
    if [ -f "src/public/js/agentWorkstation.js" ]; then
        print_test 0 "Script agentWorkstation.js existe"

        # Verificar método loadCallMetrics
        if grep -q "loadCallMetrics" "src/public/js/agentWorkstation.js"; then
            print_test 0 "Script contiene método loadCallMetrics()"
        else
            print_test 1 "Script NO contiene método loadCallMetrics()"
        fi

    else
        print_test 1 "Script agentWorkstation.js NO existe"
    fi

    echo ""
}

# ============================================================================
# TEST 6: Archivos CSS
# ============================================================================
test_css_files() {
    echo -e "${BLUE}═══ TEST 6: Archivos CSS ═══${NC}"

    if [ -f "src/public/css/softphone.css" ]; then
        print_test 0 "Archivo softphone.css existe"

        # Verificar estilos de customer popup
        if grep -q "customer-info-popup" "src/public/css/softphone.css" || \
           grep -q "customer-popup" "src/public/css/softphone.css"; then
            print_test 0 "CSS contiene estilos para customer popup"
        else
            print_test 1 "CSS NO contiene estilos para customer popup"
        fi

    else
        print_test 1 "Archivo softphone.css NO existe"
    fi

    echo ""
}

# ============================================================================
# TEST 7: Controladores y Servicios
# ============================================================================
test_controllers_services() {
    echo -e "${BLUE}═══ TEST 7: Controladores y Servicios ═══${NC}"

    # Verificar telephonyController
    if [ -f "src/controllers/telephonyController.js" ]; then
        print_test 0 "telephonyController.js existe"

        # Verificar métodos implementados
        if grep -q "lookupCustomer" "src/controllers/telephonyController.js"; then
            print_test 0 "Controller contiene método lookupCustomer"
        else
            print_test 1 "Controller NO contiene método lookupCustomer"
        fi

        if grep -q "transferCall" "src/controllers/telephonyController.js"; then
            print_test 0 "Controller contiene método transferCall"
        else
            print_test 1 "Controller NO contiene método transferCall"
        fi

    else
        print_test 1 "telephonyController.js NO existe"
    fi

    # Verificar telephonyService
    if [ -f "src/services/telephonyService.js" ]; then
        print_test 0 "telephonyService.js existe"

        # Verificar método de transferencia
        if grep -q "transferCall" "src/services/telephonyService.js"; then
            print_test 0 "Service contiene método transferCall"
        else
            print_test 1 "Service NO contiene método transferCall"
        fi

    else
        print_test 1 "telephonyService.js NO existe"
    fi

    echo ""
}

# ============================================================================
# EJECUTAR TESTS
# ============================================================================

# Verificar servidor
check_server

# Realizar login
if ! login; then
    echo -e "${YELLOW}Continuando tests sin autenticación (algunos pueden fallar)${NC}"
    echo ""
fi

# Ejecutar todos los tests
test_customer_lookup
test_call_transfer
test_call_stats
test_view_files
test_agent_workstation
test_css_files
test_controllers_services

# ============================================================================
# RESUMEN
# ============================================================================
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                        RESUMEN DE TESTS                        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Total de tests ejecutados: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Tests exitosos: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Tests fallidos: ${RED}$FAILED_TESTS${NC}"
echo ""

# Calcular porcentaje
if [ $TOTAL_TESTS -gt 0 ]; then
    PERCENTAGE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo -e "Porcentaje de éxito: ${BLUE}$PERCENTAGE%${NC}"
    echo ""

    if [ $PERCENTAGE -ge 80 ]; then
        echo -e "${GREEN}✓ Sprint 3.2.5 - Estado: EXCELENTE${NC}"
    elif [ $PERCENTAGE -ge 60 ]; then
        echo -e "${YELLOW}⚠ Sprint 3.2.5 - Estado: ACEPTABLE (revisar fallos)${NC}"
    else
        echo -e "${RED}✗ Sprint 3.2.5 - Estado: REQUIERE ATENCIÓN${NC}"
    fi
fi

echo ""

# Exit code basado en si hubo fallos
if [ $FAILED_TESTS -gt 0 ]; then
    exit 1
else
    exit 0
fi
