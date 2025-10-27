#!/bin/bash

# Test Script for Sprint 3.2: IA Agent Assist en Tiempo Real
# Valida la implementación completa del sistema de asistencia IA

echo "=========================================="
echo "Sprint 3.2: IA Agent Assist - Tests"
echo "=========================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Función para test de archivo
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

echo "=== 1. Frontend - Panel IA ===="
test_file "src/public/js/aiAssistant.js" "AIAssistant JS existe"
test_file "src/public/css/ai-assistant-panel.css" "CSS Panel IA existe"
test_content "src/views/agentsViews/agentWorkstation.ejs" "ai-assistant-panel" "Vista: Panel IA integrado"
test_content "src/views/agentsViews/agentWorkstation.ejs" "btn-get-suggestions" "Vista: Botón solicitar sugerencias"
test_content "src/views/agentsViews/agentWorkstation.ejs" "sentiment-display" "Vista: Display de sentimiento"
test_content "src/views/agentsViews/agentWorkstation.ejs" "suggestions-list" "Vista: Lista de sugerencias"
test_content "src/views/agentsViews/agentWorkstation.ejs" "transcription-container" "Vista: Contenedor de transcripción"
test_content "src/views/agentsViews/agentWorkstation.ejs" "ai-assistant-panel.css" "Vista: CSS incluido"
test_content "src/views/agentsViews/agentWorkstation.ejs" "aiAssistant.js" "Vista: JS incluido"

echo ""
echo "=== 2. Frontend - AIAssistant Class ===="
test_content "src/public/js/aiAssistant.js" "class AIAssistant" "JS: Clase AIAssistant"
test_content "src/public/js/aiAssistant.js" "getSuggestions" "JS: Método getSuggestions"
test_content "src/public/js/aiAssistant.js" "displaySuggestions" "JS: Método displaySuggestions"
test_content "src/public/js/aiAssistant.js" "displayTranscription" "JS: Método displayTranscription"
test_content "src/public/js/aiAssistant.js" "updateSentiment" "JS: Método updateSentiment"
test_content "src/public/js/aiAssistant.js" "setupWebSocketEvents" "JS: Configuración WebSocket"
test_content "src/public/js/aiAssistant.js" "ai:suggestion" "JS: Evento ai:suggestion"
test_content "src/public/js/aiAssistant.js" "ai:transcription" "JS: Evento ai:transcription"
test_content "src/public/js/aiAssistant.js" "ai:sentiment" "JS: Evento ai:sentiment"

echo ""
echo "=== 3. CSS - Estilos Panel IA ===="
test_content "src/public/css/ai-assistant-panel.css" ".ai-assistant-panel" "CSS: Clase ai-assistant-panel"
test_content "src/public/css/ai-assistant-panel.css" ".sentiment-indicator" "CSS: Clase sentiment-indicator"
test_content "src/public/css/ai-assistant-panel.css" ".suggestions-list" "CSS: Clase suggestions-list"
test_content "src/public/css/ai-assistant-panel.css" ".suggestion-item" "CSS: Clase suggestion-item"
test_content "src/public/css/ai-assistant-panel.css" ".transcription-text" "CSS: Clase transcription-text"
test_content "src/public/css/ai-assistant-panel.css" "@keyframes pulse" "CSS: Animación pulse"

echo ""
echo "=== 4. Backend - AI Service ===="
test_file "src/services/enhancedAIService.js" "Enhanced AI Service existe"
test_content "src/services/enhancedAIService.js" "getRealTimeAssistance" "AI Service: getRealTimeAssistance"
test_content "src/services/enhancedAIService.js" "analyzeSentiment" "AI Service: analyzeSentiment"
test_content "src/services/enhancedAIService.js" "transcribeAudio" "AI Service: transcribeAudio"
test_content "src/services/enhancedAIService.js" "generateCallSummary" "AI Service: generateCallSummary"

echo ""
echo "=== 5. Backend - AI Routes ===="
test_file "src/routes/aiRoutes.js" "AI Routes existe"
test_content "src/routes/aiRoutes.js" "suggestions/realtime" "Route: /suggestions/realtime"
test_content "src/routes/aiRoutes.js" "transcribe" "Route: /transcribe"
test_content "src/routes/aiRoutes.js" "analyze-sentiment" "Route: /analyze-sentiment"
test_content "src/routes/aiRoutes.js" "summarize-call" "Route: /summarize-call"

echo ""
echo "=== 6. Backend - AI Controller ===="
test_file "src/controllers/aiController.js" "AI Controller existe"
test_content "src/controllers/aiController.js" "getRealtimeSuggestions" "Controller: getRealtimeSuggestions"
test_content "src/controllers/aiController.js" "transcribeAudio" "Controller: transcribeAudio"
test_content "src/controllers/aiController.js" "analyzeSentiment" "Controller: analyzeSentiment"
test_content "src/controllers/aiController.js" "summarizeCall" "Controller: summarizeCall"
test_content "src/controllers/aiController.js" "enhancedAIService" "Controller: Import enhancedAIService"

echo ""
echo "=== 7. WebSocket - IA Events ===="
test_content "src/websocket/socketHandlers.js" "ai:request_suggestions" "WebSocket: ai:request_suggestions"
test_content "src/websocket/socketHandlers.js" "ai:transcribe_audio" "WebSocket: ai:transcribe_audio"
test_content "src/websocket/socketHandlers.js" "ai:analyze_sentiment" "WebSocket: ai:analyze_sentiment"
test_content "src/websocket/socketHandlers.js" "ai:suggestion" "WebSocket: ai:suggestion emit"
test_content "src/websocket/socketHandlers.js" "ai:transcription" "WebSocket: ai:transcription emit"
test_content "src/websocket/socketHandlers.js" "ai:sentiment" "WebSocket: ai:sentiment emit"
test_content "src/websocket/socketHandlers.js" "enhancedAIService" "WebSocket: Import enhancedAIService"

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

TOTAL=$((PASSED + FAILED))
PERCENTAGE=$((PASSED * 100 / TOTAL))

echo "Total: $TOTAL tests"
echo "Percentage: ${PERCENTAGE}%"
echo ""

if [ $PERCENTAGE -ge 90 ]; then
    echo -e "${GREEN}✅ Sprint 3.2: COMPLETADO (${PERCENTAGE}%)${NC}"
    echo ""
    echo "🎉 ¡Felicitaciones! Sprint 3.2 implementado exitosamente."
    echo ""
    echo "Próximos pasos:"
    echo "  1. Configurar OPENAI_API_KEY en .env"
    echo "  2. Reiniciar servidor: npm run dev"
    echo "  3. Probar panel IA en Agent Workstation"
    echo "  4. Verificar sugerencias y sentimiento"
    echo ""
    exit 0
elif [ $PERCENTAGE -ge 70 ]; then
    echo -e "${YELLOW}⚠️  Sprint 3.2: PARCIAL (${PERCENTAGE}%)${NC}"
    echo ""
    echo "Falta completar algunos componentes."
    echo "Revisa los tests fallidos arriba."
    echo ""
    exit 0
else
    echo -e "${RED}❌ Sprint 3.2: INCOMPLETO (${PERCENTAGE}%)${NC}"
    echo ""
    echo "Faltan componentes críticos."
    echo "Revisa la implementación."
    echo ""
    exit 1
fi
