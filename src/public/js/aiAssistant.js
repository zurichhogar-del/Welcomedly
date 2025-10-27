/**
 * Sprint 3.2: AI Assistant for Agent Workstation
 * Clase para manejar asistencia IA en tiempo real
 */

class AIAssistant {
    constructor(agentWorkstation) {
        this.agentWorkstation = agentWorkstation;
        this.isProcessing = false;
        this.currentCallContext = null;
        this.transcriptionBuffer = [];
        this.currentSuggestions = [];

        this.init();
    }

    /**
     * Inicializar AI Assistant
     */
    init() {
        console.log('🤖 Inicializando AI Assistant...');
        this.setupEventListeners();
        this.setupWebSocketEvents();
        this.updateStatus('Listo');
    }

    /**
     * Configurar event listeners del DOM
     */
    setupEventListeners() {
        // Botón solicitar sugerencias
        const btnGetSuggestions = document.getElementById('btn-get-suggestions');
        if (btnGetSuggestions) {
            btnGetSuggestions.addEventListener('click', () => {
                this.getSuggestions();
            });
        }

        // Click en sugerencias individuales
        document.addEventListener('click', (e) => {
            if (e.target.closest('.suggestion-item')) {
                const item = e.target.closest('.suggestion-item');
                const index = parseInt(item.dataset.index);
                this.useSuggestion(index);
            }
        });
    }

    /**
     * Configurar eventos de WebSocket
     */
    setupWebSocketEvents() {
        const socket = this.agentWorkstation.socket;

        // Evento: Sugerencia de IA recibida
        socket.on('ai:suggestion', (data) => {
            console.log('🤖 Sugerencia IA recibida:', data);
            this.displaySuggestions(data.suggestions);
            if (data.sentiment) {
                this.updateSentiment(data.sentiment);
            }
        });

        // Evento: Transcripción en vivo
        socket.on('ai:transcription', (data) => {
            console.log('🎤 Transcripción recibida:', data);
            this.displayTranscription(data.text, data.speaker);
        });

        // Evento: Análisis de sentimiento
        socket.on('ai:sentiment', (data) => {
            console.log('😊 Sentimiento analizado:', data);
            this.updateSentiment(data.sentiment, data.confidence);
        });

        console.log('✅ WebSocket events configurados para AI');
    }

    /**
     * Solicitar sugerencias de IA
     */
    async getSuggestions() {
        if (this.isProcessing) {
            console.log('⏳ Ya hay una solicitud en proceso');
            return;
        }

        this.isProcessing = true;
        this.updateStatus('Analizando...');

        const btnGetSuggestions = document.getElementById('btn-get-suggestions');
        if (btnGetSuggestions) {
            btnGetSuggestions.disabled = true;
            btnGetSuggestions.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Analizando...';
        }

        try {
            // Obtener contexto de la llamada actual
            const context = {
                callId: this.agentWorkstation.currentCallId || null,
                agentId: this.agentWorkstation.currentUser?.id,
                campaignId: this.agentWorkstation.currentCampaignId || null,
                customerMessage: this.getLastCustomerMessage(),
                callDuration: this.agentWorkstation.getCurrentCallDuration ? this.agentWorkstation.getCurrentCallDuration() : 0,
                previousContext: this.currentCallContext
            };

            console.log('📤 Enviando contexto a IA:', context);

            const response = await fetch('/api/ai/suggestions/realtime', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': this.getCSRFToken()
                },
                body: JSON.stringify(context)
            });

            const data = await response.json();
            console.log('📥 Respuesta de IA:', data);

            if (data.success) {
                this.displaySuggestions(data.suggestions);
                if (data.sentiment) {
                    this.updateSentiment(data.sentiment);
                }
                this.currentCallContext = data.context;
                this.showSuccess('Sugerencias generadas correctamente');
            } else {
                throw new Error(data.error || 'Error desconocido');
            }

        } catch (error) {
            console.error('❌ Error obteniendo sugerencias:', error);
            this.showError('No se pudieron obtener sugerencias de IA');
        } finally {
            this.isProcessing = false;
            this.updateStatus('Listo');

            if (btnGetSuggestions) {
                btnGetSuggestions.disabled = false;
                btnGetSuggestions.innerHTML = '<i class="fas fa-lightbulb me-2"></i>Solicitar Sugerencias';
            }
        }
    }

    /**
     * Mostrar sugerencias en el panel
     */
    displaySuggestions(suggestions) {
        const container = document.getElementById('suggestions-list');
        if (!container) {
            console.warn('⚠️ Contenedor de sugerencias no encontrado');
            return;
        }

        if (!suggestions || suggestions.length === 0) {
            container.innerHTML = '<p class="text-muted small">No hay sugerencias disponibles en este momento</p>';
            this.currentSuggestions = [];
            return;
        }

        this.currentSuggestions = suggestions;

        const html = suggestions.map((suggestion, index) => `
            <div class="suggestion-item" data-index="${index}" data-tooltip="Click para copiar">
                <div class="d-flex align-items-start">
                    <i class="fas fa-comment-dots text-primary me-2 mt-1"></i>
                    <div style="flex: 1;">
                        <strong>${suggestion.title || `Sugerencia ${ index + 1}`}</strong>
                        <p class="mb-0 small">${this.escapeHtml(suggestion.text || suggestion)}</p>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;

        // Animación de entrada
        setTimeout(() => {
            container.querySelectorAll('.suggestion-item').forEach((item, index) => {
                setTimeout(() => {
                    item.style.opacity = '0';
                    item.style.animation = 'slideIn 0.3s ease forwards';
                }, index * 100);
            });
        }, 50);
    }

    /**
     * Mostrar transcripción en vivo
     */
    displayTranscription(text, speaker = 'Cliente') {
        const container = document.getElementById('transcription-text');
        const transcriptionContainer = document.getElementById('transcription-container');

        if (!container) {
            console.warn('⚠️ Contenedor de transcripción no encontrado');
            return;
        }

        // Mostrar contenedor si está oculto
        if (transcriptionContainer) {
            transcriptionContainer.style.display = 'block';
        }

        // Crear nueva línea de transcripción
        const line = document.createElement('div');
        line.className = 'transcription-line';
        line.innerHTML = `<strong>${this.escapeHtml(speaker)}:</strong> ${this.escapeHtml(text)}`;

        container.appendChild(line);

        // Auto-scroll al final
        container.scrollTop = container.scrollHeight;

        // Agregar al buffer
        this.transcriptionBuffer.push({ speaker, text, timestamp: new Date() });

        // Mantener solo últimas 10 líneas en el DOM
        while (container.children.length > 10) {
            container.removeChild(container.firstChild);
        }

        // Mantener últimas 50 líneas en el buffer
        if (this.transcriptionBuffer.length > 50) {
            this.transcriptionBuffer = this.transcriptionBuffer.slice(-50);
        }
    }

    /**
     * Actualizar indicador de sentimiento
     */
    updateSentiment(sentiment, confidence = 0.8) {
        const badge = document.getElementById('sentiment-badge');
        const bar = document.getElementById('sentiment-bar');

        if (!badge || !bar) {
            console.warn('⚠️ Elementos de sentimiento no encontrados');
            return;
        }

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

        console.log(`😊 Sentimiento actualizado: ${sentiment} (${(confidence * 100).toFixed(0)}%)`);
    }

    /**
     * Actualizar estado del AI Assistant
     */
    updateStatus(status) {
        const statusBadge = document.getElementById('ai-status');
        if (!statusBadge) {return;}

        statusBadge.textContent = status;

        const panel = document.querySelector('.ai-assistant-panel');
        if (!panel) {return;}

        if (status === 'Analizando...') {
            panel.classList.add('ai-processing');
        } else {
            panel.classList.remove('ai-processing');
        }
    }

    /**
     * Usar una sugerencia (copiar al portapapeles)
     */
    useSuggestion(index) {
        if (index < 0 || index >= this.currentSuggestions.length) {
            console.warn('⚠️ Índice de sugerencia inválido:', index);
            return;
        }

        const suggestion = this.currentSuggestions[index];
        const text = suggestion.text || suggestion;

        // Copiar al portapapeles
        this.copyToClipboard(text);

        // Visual feedback
        const item = document.querySelector(`.suggestion-item[data-index="${index}"]`);
        if (item) {
            item.classList.add('copied');
            setTimeout(() => {
                item.classList.remove('copied');
            }, 2000);
        }

        this.showSuccess('Sugerencia copiada al portapapeles');
        console.log('📋 Sugerencia copiada:', text);
    }

    /**
     * Obtener último mensaje del cliente
     */
    getLastCustomerMessage() {
        if (this.transcriptionBuffer.length === 0) {
            return 'Sin transcripción disponible';
        }

        // Buscar último mensaje del cliente
        for (let i = this.transcriptionBuffer.length - 1; i >= 0; i--) {
            if (this.transcriptionBuffer[i].speaker === 'Cliente') {
                return this.transcriptionBuffer[i].text;
            }
        }

        return this.transcriptionBuffer[this.transcriptionBuffer.length - 1].text;
    }

    /**
     * Copiar texto al portapapeles
     */
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback para navegadores antiguos
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }
        } catch (error) {
            console.error('Error copiando al portapapeles:', error);
        }
    }

    /**
     * Obtener token CSRF
     */
    getCSRFToken() {
        // Intentar obtener del meta tag
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        if (metaTag) {
            return metaTag.getAttribute('content');
        }

        // Fallback: intentar desde agentWorkstation
        if (this.agentWorkstation && this.agentWorkstation.getCSRFToken) {
            return this.agentWorkstation.getCSRFToken();
        }

        console.warn('⚠️ CSRF token no encontrado');
        return '';
    }

    /**
     * Escapar HTML para prevenir XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Mostrar mensaje de éxito
     */
    showSuccess(message) {
        if (window.Swal) {
            Swal.fire({
                icon: 'success',
                title: message,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        } else {
            console.log('✅', message);
        }
    }

    /**
     * Mostrar mensaje de error
     */
    showError(message) {
        if (window.Swal) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: message,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 4000
            });
        } else {
            console.error('❌', message);
        }
    }

    /**
     * Limpiar buffer de transcripción
     */
    clearTranscription() {
        this.transcriptionBuffer = [];
        const container = document.getElementById('transcription-text');
        if (container) {
            container.innerHTML = '';
        }
        console.log('🗑️ Buffer de transcripción limpiado');
    }

    /**
     * Resetear estado
     */
    reset() {
        this.isProcessing = false;
        this.currentCallContext = null;
        this.clearTranscription();
        this.currentSuggestions = [];

        const container = document.getElementById('suggestions-list');
        if (container) {
            container.innerHTML = '<p class="text-muted small">Haz clic en "Solicitar Sugerencias" durante una llamada</p>';
        }

        this.updateSentiment('neutral', 0);
        this.updateStatus('Listo');

        console.log('🔄 AI Assistant reseteado');
    }
}

// Inicializar cuando AgentWorkstation esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 DOM cargado, esperando AgentWorkstation...');

    // Esperar a que AgentWorkstation esté disponible
    const initAI = () => {
        if (window.agentWorkstation) {
            console.log('✅ AgentWorkstation encontrado, inicializando AI Assistant');
            window.aiAssistant = new AIAssistant(window.agentWorkstation);
        } else {
            console.log('⏳ AgentWorkstation no disponible, reintentando en 500ms...');
            setTimeout(initAI, 500);
        }
    };

    initAI();
});
