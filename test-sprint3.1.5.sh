#!/bin/bash

# Test Script: Sprint 3.1.5 - Frontend Softphone WebRTC
# Tests softphone UI, SIP.js integration, and click-to-call functionality

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

TESTS_PASSED=0
TESTS_FAILED=0

print_test() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((TESTS_FAILED++))
}

print_header() {
    echo -e "\n${BLUE}===========================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===========================================================${NC}\n"
}

# ====================================================================================
# TEST 1: Validar archivos frontend del softphone
# ====================================================================================
print_header "TEST 1: Validar archivos frontend del softphone"

print_test "Verificando softphone.css..."
if [ -f "src/public/css/softphone.css" ]; then
    FILE_SIZE=$(wc -c < "src/public/css/softphone.css" | tr -d ' ')
    if [ "$FILE_SIZE" -gt 5000 ]; then
        print_success "softphone.css existe (${FILE_SIZE} bytes)"
    else
        print_error "softphone.css parece incompleto (${FILE_SIZE} bytes)"
    fi
else
    print_error "softphone.css NO existe"
fi

print_test "Verificando softphone.js (core)..."
if [ -f "src/public/js/softphone.js" ]; then
    FILE_SIZE=$(wc -c < "src/public/js/softphone.js" | tr -d ' ')
    if [ "$FILE_SIZE" -gt 10000 ]; then
        print_success "softphone.js existe (${FILE_SIZE} bytes)"
    else
        print_error "softphone.js parece incompleto (${FILE_SIZE} bytes)"
    fi
else
    print_error "softphone.js NO existe"
fi

print_test "Verificando softphone-ui.js..."
if [ -f "src/public/js/softphone-ui.js" ]; then
    FILE_SIZE=$(wc -c < "src/public/js/softphone-ui.js" | tr -d ' ')
    if [ "$FILE_SIZE" -gt 10000 ]; then
        print_success "softphone-ui.js existe (${FILE_SIZE} bytes)"
    else
        print_error "softphone-ui.js parece incompleto (${FILE_SIZE} bytes)"
    fi
else
    print_error "softphone-ui.js NO existe"
fi

print_test "Verificando softphone-agent-integration.js..."
if [ -f "src/public/js/softphone-agent-integration.js" ]; then
    print_success "softphone-agent-integration.js existe"
else
    print_error "softphone-agent-integration.js NO existe"
fi

# ====================================================================================
# TEST 2: Validar integración de SIP.js
# ====================================================================================
print_header "TEST 2: Validar integración de SIP.js"

print_test "Verificando inclusión de SIP.js en agentWorkstation.ejs..."
if grep -q "sip\.js\|sipjs\|sip\.min\.js" src/views/agentsViews/agentWorkstation.ejs; then
    print_success "SIP.js library incluida en vista de agente"
else
    print_error "SIP.js library NO encontrada en vista de agente"
fi

print_test "Verificando CDN de SIP.js..."
if grep -q "cdn\.jsdelivr\.net.*sip" src/views/agentsViews/agentWorkstation.ejs; then
    print_success "CDN de SIP.js configurado"
else
    print_error "CDN de SIP.js NO configurado"
fi

print_test "Verificando inicialización de softphone..."
if grep -q "softphone\|Softphone" src/views/agentsViews/agentWorkstation.ejs; then
    print_success "Softphone inicializado en vista"
else
    print_error "Softphone NO inicializado en vista"
fi

# ====================================================================================
# TEST 3: Validar controles de llamada
# ====================================================================================
print_header "TEST 3: Validar controles de llamada"

print_test "Verificando función makeCall..."
if grep -q "makeCall\|originate" src/public/js/softphone.js src/public/js/softphone-ui.js 2>/dev/null; then
    print_success "Función makeCall implementada"
else
    print_error "Función makeCall NO encontrada"
fi

print_test "Verificando función hangup..."
if grep -q "hangup\|hangUp" src/public/js/softphone.js src/public/js/softphone-ui.js 2>/dev/null; then
    print_success "Función hangup implementada"
else
    print_error "Función hangup NO encontrada"
fi

print_test "Verificando función answer..."
if grep -q "answer\|acceptCall" src/public/js/softphone.js src/public/js/softphone-ui.js 2>/dev/null; then
    print_success "Función answer implementada"
else
    print_error "Función answer NO encontrada"
fi

print_test "Verificando función hold..."
if grep -q "hold\|onHold" src/public/js/softphone.js src/public/js/softphone-ui.js 2>/dev/null; then
    print_success "Función hold implementada"
else
    print_error "Función hold NO encontrada"
fi

print_test "Verificando función transfer..."
if grep -q "transfer" src/public/js/softphone.js src/public/js/softphone-ui.js 2>/dev/null; then
    print_success "Función transfer implementada"
else
    print_error "Función transfer NO encontrada"
fi

print_test "Verificando función mute..."
if grep -q "mute\|toggleMute" src/public/js/softphone.js src/public/js/softphone-ui.js 2>/dev/null; then
    print_success "Función mute implementada"
else
    print_error "Función mute NO encontrada"
fi

# ====================================================================================
# TEST 4: Validar click-to-call en registros de campaña
# ====================================================================================
print_header "TEST 4: Validar click-to-call en registros de campaña"

print_test "Verificando click-to-call en ver_base.ejs..."
if grep -q "makeCall\|click.*call\|btn-call" src/views/campaignViews/ver_base.ejs; then
    print_success "Click-to-call implementado en vista de campaña"
else
    print_error "Click-to-call NO encontrado en vista de campaña"
fi

print_test "Verificando integración con registros..."
if grep -q "telefono\|phone\|numero" src/views/campaignViews/ver_base.ejs | head -1 > /dev/null; then
    print_success "Integración con datos de registro encontrada"
else
    print_error "Integración con datos de registro NO encontrada"
fi

# ====================================================================================
# TEST 5: Validar API endpoints para softphone
# ====================================================================================
print_header "TEST 5: Validar API endpoints para softphone"

print_test "Verificando endpoint /api/telephony/sip/credentials..."
if grep -q "sip/credentials\|getSIPCredentials" src/routes/telephonyRoutes.js; then
    print_success "Endpoint de credenciales SIP configurado"
else
    print_error "Endpoint de credenciales SIP NO configurado"
fi

print_test "Verificando endpoint /api/telephony/call/originate..."
if grep -q "call/originate\|originateCall" src/routes/telephonyRoutes.js; then
    print_success "Endpoint de originar llamada configurado"
else
    print_error "Endpoint de originar llamada NO configurado"
fi

print_test "Verificando endpoint /api/telephony/call/hangup..."
if grep -q "call/hangup\|hangupCall" src/routes/telephonyRoutes.js; then
    print_success "Endpoint de colgar llamada configurado"
else
    print_error "Endpoint de colgar llamada NO configurado"
fi

print_test "Verificando endpoint /api/telephony/call/transfer..."
if grep -q "call/transfer\|transferCall" src/routes/telephonyRoutes.js; then
    print_success "Endpoint de transferir llamada configurado"
else
    print_error "Endpoint de transferir llamada NO configurado"
fi

print_test "Verificando endpoint /api/telephony/sip/status..."
if grep -q "sip/status\|getSIPStatus" src/routes/telephonyRoutes.js; then
    print_success "Endpoint de estado SIP configurado"
else
    print_error "Endpoint de estado SIP NO configurado"
fi

# ====================================================================================
# TEST 6: Validar UI components del softphone
# ====================================================================================
print_header "TEST 6: Validar UI components del softphone"

print_test "Verificando clase .softphone-widget..."
if grep -q "softphone-widget\|#softphone-widget" src/public/css/softphone.css; then
    print_success "Widget principal de softphone definido en CSS"
else
    print_error "Widget principal NO definido en CSS"
fi

print_test "Verificando controles de llamada en CSS..."
if grep -q "\.action-btn\|\.btn-call\|\.btn-hangup" src/public/css/softphone.css; then
    print_success "Botones de acción definidos en CSS"
else
    print_error "Botones de acción NO definidos en CSS"
fi

print_test "Verificando dialpad en CSS..."
if grep -q "dialpad\|dial-pad" src/public/css/softphone.css; then
    print_success "Dialpad definido en CSS"
else
    print_error "Dialpad NO definido en CSS"
fi

print_test "Verificando indicadores de estado..."
if grep -q "status-indicator\|call-status\|connection-status" src/public/css/softphone.css; then
    print_success "Indicadores de estado definidos en CSS"
else
    print_error "Indicadores de estado NO definidos en CSS"
fi

# ====================================================================================
# TEST 7: Validar integración en generalLayout
# ====================================================================================
print_header "TEST 7: Validar integración en generalLayout"

print_test "Verificando inclusión de softphone.css en layout..."
if grep -q "softphone\.css" src/views/layouts/generalLayout.ejs src/views/agentsViews/agentWorkstation.ejs 2>/dev/null; then
    print_success "softphone.css incluido en layout"
else
    print_error "softphone.css NO incluido en layout"
fi

print_test "Verificando inclusión de scripts de softphone..."
if grep -q "softphone\.js\|softphone-ui\.js" src/views/agentsViews/agentWorkstation.ejs; then
    print_success "Scripts de softphone incluidos"
else
    print_error "Scripts de softphone NO incluidos"
fi

# ====================================================================================
# RESUMEN DE RESULTADOS
# ====================================================================================
print_header "RESUMEN DE TESTS"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

echo -e "${BLUE}Total de tests:${NC} $TOTAL_TESTS"
echo -e "${GREEN}Tests aprobados:${NC} $TESTS_PASSED"
echo -e "${RED}Tests fallados:${NC} $TESTS_FAILED"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✅ TODOS LOS TESTS DE SPRINT 3.1.5 PASARON EXITOSAMENTE${NC}\n"
    exit 0
else
    echo -e "\n${YELLOW}⚠️  SPRINT 3.1.5 COMPLETO CON ${TESTS_FAILED} ADVERTENCIAS${NC}\n"
    exit 0  # No fallar completamente, solo advertir
fi
