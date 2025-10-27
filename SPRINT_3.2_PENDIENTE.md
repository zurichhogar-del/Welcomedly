# Sprint 3.2: IA Agent Assist en Tiempo Real - PENDIENTE ⚠️

**Estado actual:** 60% Implementado (Backend completo, Frontend pendiente)
**Estimación:** 4-6 horas de trabajo
**Prioridad:** MEDIA-ALTA (Feature avanzado, no bloqueante para producción)

---

## Resumen Ejecutivo

Implementar un sistema de asistencia IA en tiempo real para agentes, que proporcione:
- Sugerencias automáticas basadas en el contexto de la llamada
- Transcripción en vivo de conversaciones
- Análisis de sentimiento del cliente
- Recomendaciones de próxima mejor acción

---

## Estado Actual (60% Completado)

### ✅ Backend Ya Implementado

**1. Enhanced AI Service** (`src/services/enhancedAIService.js`)
- ✅ Integración con OpenAI GPT-4
- ✅ Speech-to-Text con Google Cloud
- ✅ Análisis de sentimiento con Natural NLP
- ✅ Sistema de prompts configurables
- ✅ Cache de respuestas para performance
- ✅ Métodos principales:
  - `getRealTimeAssistance(context, customerMessage)`
  - `generateCallSummary(callData)`
  - `analyzeSentiment(text)`
  - `transcribeAudio(audioBuffer)`

**2. AI Controller** (`src/controllers/aiController.js`)
- ✅ Endpoints básicos implementados
- ✅ Validación de autenticación
- ✅ Manejo de errores

**3. Configuración**
- ✅ Variables de entorno:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL=gpt-4`
  - `OPENAI_MAX_TOKENS=500`
  - `GOOGLE_CLOUD_KEY_FILE` (opcional para speech-to-text)

---

## Trabajo Pendiente (40%)

### ❌ 1. Panel de Sugerencias IA en Frontend

**Archivo a modificar:** `src/views/agentsViews/agentWorkstation.ejs`

**Ubicación:** Agregar panel lateral derecho (actualmente solo tiene panel izquierdo)

**Estructura HTML requerida:**
```html
<!-- Panel derecho - IA Assistant (NUEVO) -->
<div class="col-md-3">
    <!-- Card de IA Assistant -->
    <div class="card mb-3 ai-assistant-panel">
        <div class="card-header bg-gradient-primary text-white">
            <h5 class="mb-0">
                <i class="fas fa-robot me-2"></i>Asistente IA
                <span class="badge bg-light text-dark ms-2" id="ai-status">Listo</span>
            </h5>
        </div>
        <div class="card-body">
            <!-- Botón solicitar sugerencias -->
            <button class="btn btn-primary w-100 mb-3" id="btn-get-suggestions">
                <i class="fas fa-lightbulb me-2"></i>Solicitar Sugerencias
            </button>

            <!-- Análisis de sentimiento -->
            <div class="sentiment-display mb-3" id="sentiment-display">
                <label class="form-label">Sentimiento del Cliente:</label>
                <div class="sentiment-indicator">
                    <span class="badge" id="sentiment-badge">-</span>
                    <div class="progress mt-2">
                        <div class="progress-bar" id="sentiment-bar" style="width: 0%"></div>
                    </div>
                </div>
            </div>

            <!-- Sugerencias -->
            <div class="suggestions-container" id="suggestions-container">
                <label class="form-label">Sugerencias:</label>
                <div class="suggestions-list" id="suggestions-list">
                    <p class="text-muted small">Haz clic en "Solicitar Sugerencias" durante una llamada</p>
                </div>
            </div>

            <!-- Transcripción en vivo -->
            <div class="transcription-container mt-3" id="transcription-container" style="display: none;">
                <label class="form-label">Transcripción:</label>
                <div class="transcription-text" id="transcription-text">
                    <!-- Texto transcrito aparecerá aquí -->
                </div>
            </div>
        </div>
    </div>
</div>
```

**CSS requerido:** Crear `src/public/css/ai-assistant-panel.css`
```css
.ai-assistant-panel {
    border-left: 4px solid #0d6efd;
}

.sentiment-indicator .badge {
    font-size: 14px;
    padding: 8px 12px;
}

.sentiment-positive {
    background-color: #198754 !important;
}

.sentiment-negative {
    background-color: #dc3545 !important;
}

.sentiment-neutral {
    background-color: #6c757d !important;
}

.suggestions-list {
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    padding: 12px;
}

.suggestion-item {
    background: #f8f9fa;
    border-radius: 4px;
    padding: 10px;
    margin-bottom: 10px;
    cursor: pointer;
    transition: all 0.2s;
}

.suggestion-item:hover {
    background: #e9ecef;
    transform: translateX(5px);
}

.transcription-text {
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid #dee2e6;
    border-radius: 6px;
    padding: 12px;
    background: #fff;
    font-size: 14px;
    line-height: 1.6;
}

.transcription-line {
    margin-bottom: 8px;
    padding: 6px;
    border-left: 3px solid #0d6efd;
    background: #f8f9fa;
}

#ai-status {
    font-size: 11px;
    padding: 4px 8px;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.ai-processing #ai-status {
    animation: pulse 1.5s ease-in-out infinite;
}
```

---

### ❌ 2. JavaScript para Panel IA

**Archivo a crear:** `src/public/js/aiAssistant.js`

**Funcionalidades requeridas:**

```javascript
class AIAssistant {
    constructor(agentWorkstation) {
        this.agentWorkstation = agentWorkstation;
        this.isProcessing = false;
        this.currentCallContext = null;
        this.transcriptionBuffer = [];

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupWebSocketEvents();
    }

    setupEventListeners() {
        // Botón solicitar sugerencias
        document.getElementById('btn-get-suggestions')?.addEventListener('click', () => {
            this.getSuggestions();
        });
    }

    setupWebSocketEvents() {
        const socket = this.agentWorkstation.socket;

        // Evento: Sugerencia de IA recibida
        socket.on('ai:suggestion', (data) => {
            this.displaySuggestions(data.suggestions);
            this.updateSentiment(data.sentiment);
        });

        // Evento: Transcripción en vivo
        socket.on('ai:transcription', (data) => {
            this.displayTranscription(data.text, data.speaker);
        });

        // Evento: Análisis de sentimiento
        socket.on('ai:sentiment', (data) => {
            this.updateSentiment(data.sentiment, data.confidence);
        });
    }

    async getSuggestions() {
        if (this.isProcessing) return;

        this.isProcessing = true;
        this.updateStatus('Analizando...');

        try {
            const context = {
                callId: this.agentWorkstation.currentCallId,
                agentId: this.agentWorkstation.currentUser.id,
                campaignId: this.agentWorkstation.currentCampaignId,
                customerMessage: this.getLastCustomerMessage(),
                callDuration: this.agentWorkstation.getCurrentCallDuration(),
                previousContext: this.currentCallContext
            };

            const response = await fetch('/api/ai/suggestions/realtime', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.agentWorkstation.getCSRFToken()
                },
                body: JSON.stringify(context)
            });

            const data = await response.json();

            if (data.success) {
                this.displaySuggestions(data.suggestions);
                this.updateSentiment(data.sentiment);
                this.currentCallContext = data.context;
            } else {
                throw new Error(data.error);
            }

        } catch (error) {
            console.error('Error obteniendo sugerencias:', error);
            this.showError('No se pudieron obtener sugerencias');
        } finally {
            this.isProcessing = false;
            this.updateStatus('Listo');
        }
    }

    displaySuggestions(suggestions) {
        const container = document.getElementById('suggestions-list');

        if (!suggestions || suggestions.length === 0) {
            container.innerHTML = '<p class="text-muted small">No hay sugerencias disponibles</p>';
            return;
        }

        const html = suggestions.map((suggestion, index) => `
            <div class="suggestion-item" onclick="aiAssistant.useSuggestion(${index})">
                <div class="d-flex align-items-start">
                    <i class="fas fa-comment-dots text-primary me-2 mt-1"></i>
                    <div>
                        <strong>${suggestion.title || 'Sugerencia'}</strong>
                        <p class="mb-0 small">${suggestion.text}</p>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    displayTranscription(text, speaker) {
        const container = document.getElementById('transcription-text');
        container.style.display = 'block';

        const line = document.createElement('div');
        line.className = 'transcription-line';
        line.innerHTML = `<strong>${speaker}:</strong> ${text}`;

        container.appendChild(line);
        container.scrollTop = container.scrollHeight;

        // Mantener solo últimas 10 líneas
        while (container.children.length > 10) {
            container.removeChild(container.firstChild);
        }
    }

    updateSentiment(sentiment, confidence = 0) {
        const badge = document.getElementById('sentiment-badge');
        const bar = document.getElementById('sentiment-bar');

        const sentimentMap = {
            'positive': { text: 'Positivo', class: 'sentiment-positive', color: '#198754' },
            'negative': { text: 'Negativo', class: 'sentiment-negative', color: '#dc3545' },
            'neutral': { text: 'Neutral', class: 'sentiment-neutral', color: '#6c757d' }
        };

        const config = sentimentMap[sentiment] || sentimentMap.neutral;

        badge.textContent = config.text;
        badge.className = `badge ${config.class}`;
        bar.style.width = `${confidence * 100}%`;
        bar.style.backgroundColor = config.color;
    }

    updateStatus(status) {
        const statusBadge = document.getElementById('ai-status');
        statusBadge.textContent = status;

        const panel = document.querySelector('.ai-assistant-panel');
        if (status === 'Analizando...') {
            panel.classList.add('ai-processing');
        } else {
            panel.classList.remove('ai-processing');
        }
    }

    useSuggestion(index) {
        // TODO: Copiar sugerencia al portapapeles o campo de texto
        console.log('Usando sugerencia:', index);
    }

    getLastCustomerMessage() {
        // TODO: Obtener último mensaje del cliente desde transcripción
        return this.transcriptionBuffer[this.transcriptionBuffer.length - 1] || '';
    }
}

// Inicializar cuando AgentWorkstation esté listo
document.addEventListener('DOMContentLoaded', () => {
    if (window.agentWorkstation) {
        window.aiAssistant = new AIAssistant(window.agentWorkstation);
    }
});
```

---

### ❌ 3. Endpoints del Backend

**Archivo a crear:** `src/routes/aiRoutes.js`

```javascript
import express from 'express';
import aiController from '../controllers/aiController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { createResourceLimiter } from '../middlewares/rateLimitMiddleware.js';

const router = express.Router();

// Todos los endpoints requieren autenticación
router.use(requireAuth);

// POST /api/ai/suggestions/realtime - Obtener sugerencias en tiempo real
router.post('/suggestions/realtime',
    createResourceLimiter,
    aiController.getRealtimeSuggestions
);

// POST /api/ai/transcribe - Transcribir audio
router.post('/transcribe',
    createResourceLimiter,
    aiController.transcribeAudio
);

// POST /api/ai/analyze-sentiment - Analizar sentimiento
router.post('/analyze-sentiment',
    aiController.analyzeSentiment
);

// POST /api/ai/summarize-call - Resumir llamada
router.post('/summarize-call',
    aiController.summarizeCall
);

export default router;
```

**Archivo a modificar:** `src/controllers/aiController.js`

Agregar métodos faltantes:

```javascript
/**
 * Sprint 3.2: Obtener sugerencias en tiempo real
 */
async getRealtimeSuggestions(req, res) {
    try {
        const { callId, customerMessage, callDuration, previousContext } = req.body;
        const agentId = req.session.usuario.id;

        const context = {
            agentId,
            callId,
            customerMessage,
            callDuration,
            previousContext
        };

        const result = await enhancedAIService.getRealTimeAssistance(context);

        res.json({
            success: true,
            suggestions: result.suggestions,
            sentiment: result.sentiment,
            context: result.context
        });

    } catch (error) {
        logger.error('Error en getRealtimeSuggestions', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Error al obtener sugerencias'
        });
    }
}

/**
 * Sprint 3.2: Transcribir audio
 */
async transcribeAudio(req, res) {
    try {
        const { audioBuffer } = req.body;
        const agentId = req.session.usuario.id;

        const transcription = await enhancedAIService.transcribeAudio(audioBuffer);

        res.json({
            success: true,
            text: transcription.text,
            confidence: transcription.confidence
        });

    } catch (error) {
        logger.error('Error en transcribeAudio', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Error al transcribir audio'
        });
    }
}

/**
 * Sprint 3.2: Analizar sentimiento
 */
async analyzeSentiment(req, res) {
    try {
        const { text } = req.body;

        const sentiment = await enhancedAIService.analyzeSentiment(text);

        res.json({
            success: true,
            sentiment: sentiment.type,
            confidence: sentiment.confidence,
            details: sentiment.details
        });

    } catch (error) {
        logger.error('Error en analyzeSentiment', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Error al analizar sentimiento'
        });
    }
}
```

---

### ❌ 4. WebSocket Events para IA

**Archivo a modificar:** `src/websocket/socketHandlers.js`

Agregar en `setupEventHandlers()`:

```javascript
// Sprint 3.2: Solicitar sugerencias IA
socket.on('ai:request_suggestions', async (data) => {
    try {
        if (!socket.userId) {
            socket.emit('error', { message: 'No autenticado' });
            return;
        }

        const { context, customerMessage } = data;

        const result = await enhancedAIService.getRealTimeAssistance({
            agentId: socket.userId,
            context,
            customerMessage
        });

        socket.emit('ai:suggestion', {
            suggestions: result.suggestions,
            sentiment: result.sentiment,
            timestamp: new Date()
        });

    } catch (error) {
        logger.error('Error en ai:request_suggestions', { error: error.message });
        socket.emit('error', { message: 'Error obteniendo sugerencias IA' });
    }
});

// Sprint 3.2: Transcripción de audio en tiempo real
socket.on('ai:transcribe_audio', async (data) => {
    try {
        if (!socket.userId) {
            socket.emit('error', { message: 'No autenticado' });
            return;
        }

        const { audioBuffer, speaker } = data;

        const transcription = await enhancedAIService.transcribeAudio(audioBuffer);

        socket.emit('ai:transcription', {
            text: transcription.text,
            speaker: speaker || 'Cliente',
            confidence: transcription.confidence,
            timestamp: new Date()
        });

        // Analizar sentimiento del texto transcrito
        const sentiment = await enhancedAIService.analyzeSentiment(transcription.text);

        socket.emit('ai:sentiment', {
            sentiment: sentiment.type,
            confidence: sentiment.confidence,
            timestamp: new Date()
        });

    } catch (error) {
        logger.error('Error en ai:transcribe_audio', { error: error.message });
        socket.emit('error', { message: 'Error transcribiendo audio' });
    }
});
```

---

### ❌ 5. Test Suite Sprint 3.2

**Archivo a crear:** `test-sprint3.2.sh`

```bash
#!/bin/bash

# Test Script for Sprint 3.2: IA Agent Assist en Tiempo Real

echo "=========================================="
echo "Sprint 3.2: IA Agent Assist - Tests"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0

test_file() {
    local file=$1
    local description=$2

    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $description"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}: $description"
        ((FAILED++))
        return 1
    fi
}

test_content() {
    local file=$1
    local pattern=$2
    local description=$3

    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ FAIL${NC}: $description"
        ((FAILED++))
        return 1
    fi

    if grep -q "$pattern" "$file"; then
        echo -e "${GREEN}✅ PASS${NC}: $description"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC}: $description"
        ((FAILED++))
        return 1
    fi
}

echo "=== 1. Frontend - Panel IA ===="
test_file "src/public/js/aiAssistant.js" "AIAssistant JS existe"
test_file "src/public/css/ai-assistant-panel.css" "CSS Panel IA existe"
test_content "src/views/agentsViews/agentWorkstation.ejs" "ai-assistant-panel" "Vista: Panel IA integrado"

echo ""
echo "=== 2. Backend - AI Service ===="
test_file "src/services/enhancedAIService.js" "Enhanced AI Service existe"
test_content "src/services/enhancedAIService.js" "getRealTimeAssistance" "AI Service: getRealTimeAssistance"
test_content "src/services/enhancedAIService.js" "analyzeSentiment" "AI Service: analyzeSentiment"
test_content "src/services/enhancedAIService.js" "transcribeAudio" "AI Service: transcribeAudio"

echo ""
echo "=== 3. Backend - AI Routes ===="
test_file "src/routes/aiRoutes.js" "AI Routes existe"
test_content "src/routes/aiRoutes.js" "/suggestions/realtime" "Route: /suggestions/realtime"
test_content "src/routes/aiRoutes.js" "/transcribe" "Route: /transcribe"
test_content "src/routes/aiRoutes.js" "/analyze-sentiment" "Route: /analyze-sentiment"

echo ""
echo "=== 4. Backend - AI Controller ===="
test_file "src/controllers/aiController.js" "AI Controller existe"
test_content "src/controllers/aiController.js" "getRealtimeSuggestions" "Controller: getRealtimeSuggestions"
test_content "src/controllers/aiController.js" "transcribeAudio" "Controller: transcribeAudio"
test_content "src/controllers/aiController.js" "analyzeSentiment" "Controller: analyzeSentiment"

echo ""
echo "=== 5. WebSocket - IA Events ===="
test_content "src/websocket/socketHandlers.js" "ai:request_suggestions" "WebSocket: ai:request_suggestions"
test_content "src/websocket/socketHandlers.js" "ai:transcribe_audio" "WebSocket: ai:transcribe_audio"
test_content "src/websocket/socketHandlers.js" "ai:suggestion" "WebSocket: ai:suggestion emit"
test_content "src/websocket/socketHandlers.js" "ai:transcription" "WebSocket: ai:transcription emit"
test_content "src/websocket/socketHandlers.js" "ai:sentiment" "WebSocket: ai:sentiment emit"

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

TOTAL=$((PASSED + FAILED))
PERCENTAGE=$((PASSED * 100 / TOTAL))

if [ $PERCENTAGE -ge 90 ]; then
    echo -e "${GREEN}✅ Sprint 3.2: COMPLETADO (${PERCENTAGE}%)${NC}"
    exit 0
elif [ $PERCENTAGE -ge 70 ]; then
    echo -e "${YELLOW}⚠️  Sprint 3.2: PARCIAL (${PERCENTAGE}%)${NC}"
    exit 0
else
    echo -e "${RED}❌ Sprint 3.2: INCOMPLETO (${PERCENTAGE}%)${NC}"
    exit 1
fi
```

---

## Orden de Implementación Recomendado

### Sesión 1 (2-3 horas):
1. ✅ Crear `src/public/css/ai-assistant-panel.css`
2. ✅ Modificar `src/views/agentsViews/agentWorkstation.ejs` (agregar panel)
3. ✅ Crear `src/public/js/aiAssistant.js` (clase completa)
4. ✅ Incluir scripts en layout

### Sesión 2 (1-2 horas):
5. ✅ Crear `src/routes/aiRoutes.js`
6. ✅ Modificar `src/controllers/aiController.js` (agregar métodos)
7. ✅ Registrar rutas en `src/routes/index.js`
8. ✅ Probar endpoints con Postman

### Sesión 3 (1 hora):
9. ✅ Modificar `src/websocket/socketHandlers.js` (agregar eventos IA)
10. ✅ Probar eventos WebSocket desde frontend
11. ✅ Crear `test-sprint3.2.sh`
12. ✅ Ejecutar tests y verificar cobertura

---

## Variables de Entorno Requeridas

Agregar al archivo `.env`:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=500
OPENAI_TEMPERATURE=0.7

# Google Cloud Speech-to-Text (Opcional)
GOOGLE_CLOUD_KEY_FILE=./service-account.json
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# AI Features Toggle
AI_FEATURES_ENABLED=true
AI_REALTIME_SUGGESTIONS=true
AI_TRANSCRIPTION=true
AI_SENTIMENT_ANALYSIS=true
```

---

## Dependencias NPM Requeridas

Verificar que estén instaladas:

```bash
npm install openai @google-cloud/speech natural
```

---

## Testing Manual

### 1. Probar Panel IA:
1. Abrir Agent Workstation
2. Verificar panel derecho con "Asistente IA"
3. Click en "Solicitar Sugerencias"
4. Verificar que aparezcan sugerencias
5. Verificar indicador de sentimiento

### 2. Probar WebSocket Events:
1. Abrir DevTools Console
2. Ejecutar: `agentWorkstation.socket.emit('ai:request_suggestions', {context: 'test'})`
3. Verificar evento `ai:suggestion` recibido

### 3. Probar Endpoints:
```bash
# Test endpoint de sugerencias
curl -X POST http://localhost:3000/api/ai/suggestions/realtime \
  -H "Content-Type: application/json" \
  -d '{"customerMessage": "I want to cancel my subscription"}'

# Test endpoint de sentimiento
curl -X POST http://localhost:3000/api/ai/analyze-sentiment \
  -H "Content-Type: application/json" \
  -d '{"text": "I am very happy with the service"}'
```

---

## Métricas de Éxito

Sprint 3.2 se considerará completo cuando:
- [ ] Panel IA visible en Agent Workstation
- [ ] Botón "Solicitar Sugerencias" funcional
- [ ] Sugerencias se muestran correctamente
- [ ] Análisis de sentimiento actualiza en tiempo real
- [ ] WebSocket events funcionan bidireccional
- [ ] Test suite pasa con ≥90% (≥36/40 tests)
- [ ] Sin errores en logs de Winston
- [ ] Performance < 2s para generar sugerencias

---

## Notas Importantes

1. **API Keys:** Asegurar que `OPENAI_API_KEY` esté configurada
2. **Rate Limiting:** OpenAI tiene límites de requests/minuto
3. **Costos:** Cada request a GPT-4 tiene costo ($0.03/1K tokens)
4. **Fallback:** Si OpenAI falla, mostrar mensaje amigable
5. **Cache:** Implementar cache de sugerencias frecuentes
6. **Performance:** Transcripción puede tardar 1-3 segundos

---

## Referencias

- OpenAI API Docs: https://platform.openai.com/docs/api-reference
- Google Speech-to-Text: https://cloud.google.com/speech-to-text/docs
- Natural NLP: https://github.com/NaturalNode/natural
- Socket.IO Custom Events: https://socket.io/docs/v4/emitting-events/

---

## Contacto

Para dudas sobre Sprint 3.2:
- Revisar `src/services/enhancedAIService.js` (backend ya implementado)
- Verificar logs: `tail -f logs/app-*.log | grep -i "ai\|openai"`
- Test individual: `node -e "import('./src/services/enhancedAIService.js')"`

---

**Sprint 3.2 - Pendiente**
**Última actualización:** 2025-10-26
**Prioridad:** MEDIA-ALTA
**Estimación:** 4-6 horas
