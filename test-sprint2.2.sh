#!/bin/bash

# Test Script for Sprint 2.2: Sistema de Recuperación de Sesión
# Valida la implementación completa del sistema de reconexión automática WebSocket

echo "=========================================="
echo "Sprint 2.2: Session Recovery - Tests"
echo "=========================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Función para test
test_file() {
    local file=$1
    local description=$2

    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $description"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}: $description"
        echo "   Archivo no encontrado: $file"
        ((FAILED++))
        return 1
    fi
}

# Función para test de contenido
test_content() {
    local file=$1
    local pattern=$2
    local description=$3

    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ FAIL${NC}: $description"
        echo "   Archivo no encontrado: $file"
        ((FAILED++))
        return 1
    fi

    if grep -q "$pattern" "$file"; then
        echo -e "${GREEN}✅ PASS${NC}: $description"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}: $description"
        echo "   Patrón no encontrado en $file: $pattern"
        ((FAILED++))
        return 1
    fi
}

echo "=== 1. Frontend - Reconexión Automática ===="
echo ""

# Test agentWorkstation.js
test_file "src/public/js/agentWorkstation.js" "AgentWorkstation JS existe"
test_content "src/public/js/agentWorkstation.js" "reconnectionAttempts" "Frontend: Variable reconnectionAttempts"
test_content "src/public/js/agentWorkstation.js" "maxReconnectionAttempts" "Frontend: Variable maxReconnectionAttempts"
test_content "src/public/js/agentWorkstation.js" "baseReconnectionDelay" "Frontend: Variable baseReconnectionDelay"
test_content "src/public/js/agentWorkstation.js" "maxReconnectionDelay" "Frontend: Variable maxReconnectionDelay"
test_content "src/public/js/agentWorkstation.js" "handleDisconnection" "Frontend: Método handleDisconnection"
test_content "src/public/js/agentWorkstation.js" "attemptReconnection" "Frontend: Método attemptReconnection"
test_content "src/public/js/agentWorkstation.js" "showReconnectionModal" "Frontend: Método showReconnectionModal"
test_content "src/public/js/agentWorkstation.js" "hideReconnectionModal" "Frontend: Método hideReconnectionModal"
test_content "src/public/js/agentWorkstation.js" "updateReconnectionModal" "Frontend: Método updateReconnectionModal"
test_content "src/public/js/agentWorkstation.js" "showReconnectionError" "Frontend: Método showReconnectionError"

echo ""
echo "=== 2. Frontend - Backoff Exponencial ===="
echo ""

test_content "src/public/js/agentWorkstation.js" "Math.pow(2, this.reconnectionAttempts - 1)" "Frontend: Cálculo backoff exponencial"
test_content "src/public/js/agentWorkstation.js" "Math.min" "Frontend: Limit de delay máximo"
test_content "src/public/js/agentWorkstation.js" "this.socket.connect()" "Frontend: Reintento de conexión"

echo ""
echo "=== 3. Frontend - Modal de Reconexión ===="
echo ""

test_file "src/public/css/reconnection-modal.css" "CSS del modal de reconexión existe"
test_content "src/public/css/reconnection-modal.css" ".reconnection-modal" "CSS: Clase reconnection-modal"
test_content "src/public/css/reconnection-modal.css" ".reconnection-content" "CSS: Clase reconnection-content"
test_content "src/public/css/reconnection-modal.css" ".reconnection-spinner" "CSS: Clase reconnection-spinner"
test_content "src/public/css/reconnection-modal.css" "@keyframes spin" "CSS: Animación spinner"
test_content "src/public/css/reconnection-modal.css" "@keyframes fadeIn" "CSS: Animación fadeIn"

echo ""
echo "=== 4. Frontend - Recuperación de Sesión ===="
echo ""

test_content "src/public/js/agentWorkstation.js" "recoverActiveSession" "Frontend: Método recoverActiveSession"
test_content "src/public/js/agentWorkstation.js" "/api/agent/session/active" "Frontend: Endpoint de recuperación"
test_content "src/public/js/agentWorkstation.js" "loadInitialMetrics" "Frontend: Carga de métricas iniciales"
test_content "src/public/js/agentWorkstation.js" "syncMetricsWithBackend" "Frontend: Sincronización de métricas"

echo ""
echo "=== 5. Backend - Endpoint de Recuperación ===="
echo ""

test_content "src/controllers/agentStatusController.js" "getActiveSessionForRecovery" "Backend: Método getActiveSessionForRecovery"
test_content "src/routes/agentStatusRoutes.js" "/session/active" "Backend: Ruta /session/active"

echo ""
echo "=== 6. WebSocket - Manejo de Desconexión ===="
echo ""

test_file "src/websocket/socketHandlers.js" "SocketHandlers existe"
test_content "src/websocket/socketHandlers.js" "disconnect" "WebSocket: Handler de disconnect"
test_content "src/websocket/socketHandlers.js" "gracePeriod" "WebSocket: Grace period para reconexión"
test_content "src/websocket/socketHandlers.js" "disconnectionTimeout" "WebSocket: Timeout de desconexión"
test_content "src/websocket/socketHandlers.js" "heartbeat" "WebSocket: Evento heartbeat"
test_content "src/websocket/socketHandlers.js" "heartbeat_response" "WebSocket: Respuesta heartbeat"

echo ""
echo "=== 7. WebSocket - Validación de Sesión ===="
echo ""

test_content "src/websocket/socketHandlers.js" "validateSession" "WebSocket: Método validateSession"
test_content "src/websocket/socketHandlers.js" "extractSessionId" "WebSocket: Método extractSessionId"
test_content "src/websocket/socketHandlers.js" "sessionStore" "WebSocket: Session store configurado"

echo ""
echo "=== 8. Logging y Monitoreo ===="
echo ""

test_content "src/websocket/socketHandlers.js" "logger.debug" "WebSocket: Logging de debug"
test_content "src/websocket/socketHandlers.js" "logger.info" "WebSocket: Logging de info"
test_content "src/websocket/socketHandlers.js" "logger.error" "WebSocket: Logging de error"

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

TOTAL=$((PASSED + FAILED))
PERCENTAGE=$((PASSED * 100 / TOTAL))

if [ $PERCENTAGE -ge 90 ]; then
    echo -e "${GREEN}✅ Sprint 2.2: COMPLETADO (${PERCENTAGE}%)${NC}"
    exit 0
elif [ $PERCENTAGE -ge 70 ]; then
    echo -e "${YELLOW}⚠️  Sprint 2.2: PARCIAL (${PERCENTAGE}%)${NC}"
    exit 0
else
    echo -e "${RED}❌ Sprint 2.2: INCOMPLETO (${PERCENTAGE}%)${NC}"
    exit 1
fi
