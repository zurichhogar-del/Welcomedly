/**
 * AI Coaching Service
 * Coaching en tiempo real para agentes con IA avanzada
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import EventEmitter from 'events';
import sentimentService from './sentimentAnalysisService.js';
import sttService from './speechToTextService.js';

class AICoachingService extends EventEmitter {
    constructor() {
        super();
        this.genAI = null;
        this.model = null;
        this.coachingSessions = new Map(); // sessionId -> coaching data
        this.agentProfiles = new Map(); // agentId -> agent profile
        this.coachingLibrary = new Map(); // coachingId -> coaching content
        this.performanceMetrics = new Map(); // agentId -> metrics

        this.config = {
            // Configuración de coaching
            coaching: {
                realTimeEnabled: true,
                suggestionInterval: 10000, // Sugerir cada 10 segundos
                maxSuggestionsPerMinute: 3,
                confidenceThreshold: 0.7,
                adaptiveMode: true
            },
            // Análisis de conversación
            conversation: {
                sentimentWindow: 30000, // Ventana de 30 segundos para análisis
                keywordDetection: true,
                patternRecognition: true,
                complianceChecking: true
            },
            // Tipos de coaching
            types: {
                sales: {
                    enabled: true,
                    focus: ['objection_handling', 'closing_techniques', 'value_proposition'],
                    keywords: ['precio', 'costo', 'comprar', 'decisión', 'competencia']
                },
                support: {
                    enabled: true,
                    focus: ['problem_solving', 'empathy', 'escalation'],
                    keywords: ['problema', 'ayuda', 'solución', 'error', 'funciona']
                },
                retention: {
                    enabled: true,
                    focus: ['relationship_building', 'value_communication', 'concern_addressing'],
                    keywords: ['cancelar', 'baja', 'dejar', 'motivo', 'problema']
                }
            }
        };

        this.initializeAI();
        this.loadCoachingLibrary();
        this.setupEventListeners();
    }

    /**
     * Inicializar Google Generative AI
     */
    async initializeAI() {
        try {
            const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
            if (!apiKey) {
                console.warn('⚠️ No Google AI API key found, coaching will use rule-based suggestions');
                return;
            }

            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({
                model: 'gemini-1.5-flash',
                generationConfig: {
                    temperature: 0.3,
                    topP: 0.8,
                    topK: 40,
                    maxOutputTokens: 2048,
                }
            });

            console.log('🎯 Google Generative AI initialized for AI Coaching');
        } catch (error) {
            console.error('❌ Failed to initialize AI Coaching:', error);
        }
    }

    /**
     * Cargar biblioteca de coaching
     */
    loadCoachingLibrary() {
        // Coaching para ventas
        this.coachingLibrary.set('sales_objection_price', {
            id: 'sales_objection_price',
            type: 'sales',
            title: 'Manejo de objeciones de precio',
            triggers: ['precio alto', 'muy caro', 'competencia más barata', 'no puedo pagar'],
            suggestions: [
                'Entiende la preocupación del cliente sobre el precio',
                'Reenfoca el valor en lugar del costo',
                'Compara con soluciones más costosas',
                'Ofrece opciones de pago o paquetes'
            ],
            script: 'Comprendo tu preocupación sobre el precio. Permíteme mostrarte cómo el valor que recibes supera ampliamente la inversión.',
            priority: 'high'
        });

        this.coachingLibrary.set('sales_closing', {
            id: 'sales_closing',
            type: 'sales',
            title: 'Técnicas de cierre',
            triggers: ['voy a pensar', 'necesito consultar', 'llamo más tarde', 'no estoy seguro'],
            suggestions: [
                'Identificar la objeción real',
                'Crear urgencia sutilmente',
                'Ofrecer garantía o prueba',
                'Confirmar próximos pasos'
            ],
            script: '¿Qué información específica necesitarías para tomar una decisión informada hoy mismo?',
            priority: 'high'
        });

        // Coaching para soporte
        this.coachingLibrary.set('support_empathy', {
            id: 'support_empathy',
            type: 'support',
            title: 'Empatía y validación',
            triggers: ['cliente frustrado', 'enojado', 'molesto', 'disgustado'],
            suggestions: [
                'Validar los sentimientos del cliente',
                'Mostrar comprensión genuina',
                'Evitar ser defensivo',
                'Ofrecer solución concreta'
            ],
            script: 'Entiendo completamente tu frustración. Estamos aquí para resolver esto contigo.',
            priority: 'high'
        });

        this.coachingLibrary.set('support_technical', {
            id: 'support_technical',
            type: 'support',
            title: 'Explicación técnica simplificada',
            triggers: ['explicar técnica', 'cómo funciona', 'détalles técnicos'],
            suggestions: [
                'Usar analogías simples',
                'Evitar jerga técnica',
                'Confirmar entendimiento',
                'Proporcionar recursos visuales'
            ],
            script: 'Piensa en esto como [analogía simple]. ¿Te queda claro así o necesitas que lo explique de otra manera?',
            priority: 'medium'
        });

        // Coaching para retención
        this.coachingLibrary.set('retention_concern', {
            id: 'retention_concern',
            type: 'retention',
            title: 'Manejo de preocupaciones de retención',
            triggers: ['quiero cancelar', 'dar de baja', 'no me sirve', 'problema constante'],
            suggestions: [
                'Escuchar activamente sin interrumpir',
                'Identificar la causa raíz',
                'Ofrecer solución inmediata',
                'Demostrar valor perdido si se va'
            ],
            script: 'Antes de proceder con la cancelación, me gustaría entender qué está causando tu decisión para ver si podemos resolverlo.',
            priority: 'critical'
        });

        console.log(`📚 Loaded ${this.coachingLibrary.size} coaching templates`);
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Escuchar eventos de sentiment analysis
        if (sentimentService) {
            sentimentService.on('textAnalyzed', (data) => {
                this.handleSentimentUpdate(data);
            });

            sentimentService.on('sentimentAlert', (data) => {
                this.handleSentimentAlert(data);
            });
        }

        // Escuchar eventos de speech-to-text
        if (sttService) {
            sttService.on('finalTranscript', (data) => {
                this.handleTranscriptUpdate(data);
            });
        }
    }

    /**
     * Iniciar sesión de coaching
     */
    startCoachingSession(sessionId, agentId, metadata = {}) {
        try {
            const coachingSession = {
                sessionId,
                agentId,
                startTime: Date.now(),
                metadata: {
                    campaignId: metadata.campaignId,
                    customerId: metadata.customerId,
                    callType: metadata.callType || 'sales',
                    ...metadata
                },
                suggestions: [],
                sentimentHistory: [],
                transcriptSegments: [],
                performanceMetrics: {
                    talkTime: 0,
                    listenTime: 0,
                    questionsAsked: 0,
                    objectionsHandled: 0,
                    customerSatisfaction: 0
                },
                currentContext: {
                    stage: 'opening',
                    customerMood: 'neutral',
                    lastSuggestion: null,
                    suggestionCount: 0
                },
                adaptiveProfile: this.getOrCreateAgentProfile(agentId)
            };

            this.coachingSessions.set(sessionId, coachingSession);

            console.log(`🎯 Started AI coaching session: ${sessionId} for agent: ${agentId}`);

            this.emit('coachingSessionStarted', {
                sessionId,
                agentId,
                metadata: coachingSession.metadata,
                timestamp: new Date().toISOString()
            });

            return {
                sessionId,
                agentId,
                coachingEnabled: true,
                realTimeSuggestions: this.config.coaching.realTimeEnabled,
                suggestionInterval: this.config.coaching.suggestionInterval
            };

        } catch (error) {
            console.error('Error starting coaching session:', error);
            throw error;
        }
    }

    /**
     * Manejar actualización de sentimiento
     */
    handleSentimentUpdate(data) {
        const session = this.coachingSessions.get(data.sessionId);
        if (!session) return;

        // Actualizar historial de sentimiento
        session.sentimentHistory.push({
            timestamp: data.analysis.timestamp,
            sentiment: data.analysis.overallSentiment,
            score: data.analysis.score,
            confidence: data.analysis.confidence
        });

        // Actualizar contexto
        session.currentContext.customerMood = data.analysis.overallSentiment;

        // Generar sugerencias si hay cambios significativos
        if (this.shouldGenerateSuggestion(session, data.analysis)) {
            this.generateContextualSuggestion(session, 'sentiment_change', data.analysis);
        }
    }

    /**
     * Manejar alertas de sentimiento
     */
    handleSentimentAlert(data) {
        const session = this.coachingSessions.get(data.sessionId);
        if (!session) return;

        // Generar sugerencia inmediata para alertas
        this.generateImmediateSuggestion(session, 'sentiment_alert', data);
    }

    /**
     * Manejar actualización de transcripción
     */
    handleTranscriptUpdate(data) {
        const session = this.coachingSessions.get(data.sessionId);
        if (!session) return;

        // Agregar segmento de transcripción
        session.transcriptSegments.push({
            timestamp: data.timestamp,
            transcript: data.transcript,
            speaker: data.speaker,
            sentiment: null // Se llenará cuando llegue el análisis
        });

        // Analizar palabras clave
        const keywordAnalysis = this.analyzeKeywords(data.transcript, session.metadata.callType);
        if (keywordAnalysis.matches.length > 0) {
            this.generateKeywordBasedSuggestion(session, keywordAnalysis);
        }

        // Detectar patrones de conversación
        const patterns = this.detectConversationPatterns(data.transcript, session);
        if (patterns.length > 0) {
            this.generatePatternBasedSuggestion(session, patterns);
        }

        // Actualizar métricas
        this.updatePerformanceMetrics(session, data);
    }

    /**
     * Analizar palabras clave
     */
    analyzeKeywords(text, callType) {
        const matches = [];
        const lowerText = text.toLowerCase();

        for (const [coachingId, coaching] of this.coachingLibrary) {
            if (coaching.type === callType) {
                for (const trigger of coaching.triggers) {
                    if (lowerText.includes(trigger.toLowerCase())) {
                        matches.push({
                            coachingId,
                            trigger,
                            text,
                            confidence: this.calculateTriggerConfidence(text, trigger)
                        });
                    }
                }
            }
        }

        return {
            matches: matches.sort((a, b) => b.confidence - a.confidence),
            totalMatches: matches.length
        };
    }

    /**
     * Detectar patrones de conversación
     */
    detectConversationPatterns(text, session) {
        const patterns = [];
        const lowerText = text.toLowerCase();

        // Patrón: Cliente expresando duda
        if (lowerText.includes('no estoy seguro') || lowerText.includes('tengo dudas')) {
            patterns.push({
                type: 'customer_uncertainty',
                severity: 'medium',
                suggestion: 'Clarificar dudas y reforzar valor'
            });
        }

        // Patrón: Cliente mencionando competencia
        if (lowerText.includes('competencia') || lowerText.includes('otra empresa')) {
            patterns.push({
                type: 'competitor_mention',
                severity: 'high',
                suggestion: 'Diferenciar propuesta y resaltar ventajas únicas'
            });
        }

        // Patrón: Cliente con objeción técnica
        if (lowerText.includes('cómo funciona') || lowerText.includes('explicar')) {
            patterns.push({
                type: 'technical_inquiry',
                severity: 'low',
                suggestion: 'Simplificar explicación técnica'
            });
        }

        // Patrón: Agente interrumpiendo (basado en longitud de frases)
        if (text.length < 20 && session.transcriptSegments.length > 2) {
            patterns.push({
                type: 'potential_interruption',
                severity: 'low',
                suggestion: 'Permitir que el cliente termine de expresarse'
            });
        }

        return patterns;
    }

    /**
     * Generar sugerencia basada en palabras clave
     */
    generateKeywordBasedSuggestion(session, keywordAnalysis) {
        const bestMatch = keywordAnalysis.matches[0];
        if (!bestMatch || bestMatch.confidence < 0.6) return;

        const coaching = this.coachingLibrary.get(bestMatch.coachingId);
        if (!coaching) return;

        const suggestion = {
            id: crypto.randomUUID(),
            type: 'keyword_based',
            priority: coaching.priority,
            title: coaching.title,
            content: coaching.suggestions[0],
            script: coaching.script,
            trigger: bestMatch.trigger,
            confidence: bestMatch.confidence,
            timestamp: new Date().toISOString(),
            coachingId: coaching.id
        };

        this.deliverSuggestion(session, suggestion);
    }

    /**
     * Generar sugerencia basada en patrones
     */
    generatePatternBasedSuggestion(session, patterns) {
        const highSeverityPattern = patterns.find(p => p.severity === 'high');
        const pattern = highSeverityPattern || patterns[0];

        if (!pattern) return;

        const suggestion = {
            id: crypto.randomUUID(),
            type: 'pattern_based',
            priority: pattern.severity,
            title: `Patrón detectado: ${pattern.type}`,
            content: pattern.suggestion,
            timestamp: new Date().toISOString(),
            patternType: pattern.type
        };

        this.deliverSuggestion(session, suggestion);
    }

    /**
     * Generar sugerencia contextual
     */
    async generateContextualSuggestion(session, triggerType, data) {
        if (!this.model) {
            return this.generateRuleBasedSuggestion(session, triggerType, data);
        }

        try {
            const context = this.buildContext(session, data);
            const prompt = this.buildCoachingPrompt(context, triggerType);

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const textResponse = response.text();

            const suggestion = this.parseAIResponse(textResponse);
            suggestion.id = crypto.randomUUID();
            suggestion.type = 'ai_contextual';
            suggestion.triggerType = triggerType;
            suggestion.timestamp = new Date().toISOString();

            this.deliverSuggestion(session, suggestion);

        } catch (error) {
            console.error('Error generating AI suggestion:', error);
            this.generateRuleBasedSuggestion(session, triggerType, data);
        }
    }

    /**
     * Generar sugerencia inmediata
     */
    generateImmediateSuggestion(session, alertType, data) {
        const suggestion = {
            id: crypto.randomUUID(),
            type: 'immediate_alert',
            priority: 'critical',
            title: `Alerta de ${data.alert.type}`,
            content: this.getAlertSuggestion(data.alert.type),
            timestamp: new Date().toISOString(),
            alertData: data.alert
        };

        this.deliverSuggestion(session, suggestion);
    }

    /**
     * Generar sugerencia basada en reglas
     */
    generateRuleBasedSuggestion(session, triggerType, data) {
        let suggestion = null;

        switch (triggerType) {
            case 'sentiment_change':
                if (data.overallSentiment === 'negative') {
                    suggestion = {
                        id: crypto.randomUUID(),
                        type: 'rule_based',
                        priority: 'high',
                        title: 'Cambiar enfoque de comunicación',
                        content: 'El cliente muestra sentimiento negativo. Considera: 1) Validar sus preocupaciones, 2) Ofrecer solución inmediata, 3) Mostrar más empatía',
                        timestamp: new Date().toISOString()
                    };
                }
                break;

            case 'negative_sentiment':
                suggestion = {
                    id: crypto.randomUUID(),
                    type: 'rule_based',
                    priority: 'critical',
                    title: 'Recuperar relación con cliente',
                    content: 'Cliente muy insatisfecho. Acciones recomendadas: 1) Escuchar activamente sin interrumpir, 2) Disculparse sinceramente, 3) Ofrecer solución concreta',
                    timestamp: new Date().toISOString()
                };
                break;
        }

        if (suggestion) {
            this.deliverSuggestion(session, suggestion);
        }
    }

    /**
     * Entregar sugerencia al agente
     */
    deliverSuggestion(session, suggestion) {
        // Verificar límite de sugerencias
        if (this.exceedsSuggestionLimit(session)) {
            console.log(`Suggestion limit exceeded for session ${session.sessionId}`);
            return;
        }

        // Agregar sugerencia a la sesión
        session.suggestions.push(suggestion);
        session.currentContext.lastSuggestion = suggestion;
        session.currentContext.suggestionCount++;

        // Actualizar perfil adaptativo
        this.updateAdaptiveProfile(session, suggestion);

        // Emitir evento
        this.emit('coachingSuggestion', {
            sessionId: session.sessionId,
            agentId: session.agentId,
            suggestion,
            timestamp: new Date().toISOString()
        });

        console.log(`💡 Coaching suggestion delivered to agent ${session.agentId}: ${suggestion.title}`);
    }

    /**
     * Verificar si se debe generar sugerencia
     */
    shouldGenerateSuggestion(session, analysis) {
        // No generar si hay una sugerencia reciente
        if (session.currentContext.lastSuggestion) {
            const timeSinceLastSuggestion = Date.now() - new Date(session.currentContext.lastSuggestion.timestamp).getTime();
            if (timeSinceLastSuggestion < this.config.coaching.suggestionInterval) {
                return false;
            }
        }

        // Generar si hay cambios significativos de sentimiento
        if (session.sentimentHistory.length > 1) {
            const lastSentiment = session.sentimentHistory[session.sentimentHistory.length - 2];
            const sentimentChange = Math.abs(analysis.score - lastSentiment.score);
            return sentimentChange > 1.0;
        }

        return false;
    }

    /**
     * Construir contexto para IA
     */
    buildContext(session, data) {
        const recentTranscript = session.transcriptSegments.slice(-5).map(s => s.transcript).join(' ');
        const recentSentiment = session.sentimentHistory.slice(-3);

        return {
            agentId: session.agentId,
            callType: session.metadata.callType,
            callDuration: Date.now() - session.startTime,
            customerMood: session.currentContext.customerMood,
            recentTranscript,
            recentSentiment,
            suggestionsCount: session.currentContext.suggestionCount,
            agentExperience: session.adaptiveProfile.experienceLevel,
            currentData: data
        };
    }

    /**
     * Construir prompt para IA
     */
    buildCoachingPrompt(context, triggerType) {
        return `
Como experto en coaching de call center, analiza el siguiente contexto y proporciona una sugerencia específica y accionable.

TIPO DE LLAMADA: ${context.callType}
DURACIÓN: ${Math.floor(context.callDuration / 60000)} minutos
ESTADO DE ÁNIMO DEL CLIENTE: ${context.customerMood}
TRANSCRIPCIÓN RECIENTE: "${context.recentTranscript}"
DISPARADOR: ${triggerType}

INFORMACIÓN ADICIONAL:
- Nivel de experiencia del agente: ${context.agentExperience}
- Sugerencias ya dadas: ${context.suggestionsCount}

Proporciona una sugerencia en formato JSON:
{
    "title": "Título breve y claro",
    "content": "Sugerencia específica y accionable",
    "script": "Frase exacta que puede usar el agente",
    "priority": "low|medium|high|critical",
    "reasoning": "Por qué esta sugerencia es importante ahora"
}

La sugerencia debe ser:
1. Específica para la situación actual
2. Fácil de implementar inmediatamente
3. Alineada con el tipo de llamada
4. Considerando el nivel de experiencia del agente
`;
    }

    /**
     * Parsear respuesta de IA
     */
    parseAIResponse(response) {
        try {
            const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
            return JSON.parse(cleanedResponse);
        } catch (error) {
            console.warn('Failed to parse AI response:', error);
            return {
                title: 'Sugerencia de coaching',
                content: response.substring(0, 200),
                script: 'Considera el contexto actual para adaptar tu enfoque',
                priority: 'medium',
                reasoning: 'Análisis de IA de la conversación'
            };
        }
    }

    /**
     * Obtener sugerencia para alerta
     */
    getAlertSuggestion(alertType) {
        const alertSuggestions = {
            'negative_sentiment': 'El cliente está muy insatisfecho. Escucha activamente, valida sus sentimientos y ofrece una solución inmediata.',
            'high_urgency': 'El cliente necesita ayuda urgente. Prioriza su caso, confirma el problema y establece expectativas claras.',
            'high_emotion': 'El cliente muestra alta intensidad emocional. Mantén la calma, sé empático y no tomes personalmente.',
            'sentiment_shift': 'Detecté un cambio en el sentimiento. Investiga qué causó el cambio y adapta tu enfoque.'
        };

        return alertSuggestions[alertType] || 'Mantén el enfoque en las necesidades del cliente.';
    }

    /**
     * Actualizar métricas de desempeño
     */
    updatePerformanceMetrics(session, transcriptData) {
        const metrics = session.performanceMetrics;

        // Actualizar tiempo de habla
        if (transcriptData.speaker === 'agent') {
            metrics.talkTime += this.estimateSpeechTime(transcriptData.transcript);
        } else {
            metrics.listenTime += this.estimateSpeechTime(transcriptData.transcript);
        }

        // Contar preguntas
        const questionCount = (transcriptData.transcript.match(/[¿?]/g) || []).length;
        metrics.questionsAsked += questionCount;

        // Detectar manejo de objeciones
        if (this.isObjectionHandling(transcriptData.transcript)) {
            metrics.objectionsHandled++;
        }
    }

    /**
     * Crear o obtener perfil de agente
     */
    getOrCreateAgentProfile(agentId) {
        if (!this.agentProfiles.has(agentId)) {
            this.agentProfiles.set(agentId, {
                agentId,
                experienceLevel: 'intermediate',
                strengths: [],
                improvementAreas: [],
                preferredCoachingStyle: 'balanced',
                coachingHistory: [],
                performanceMetrics: {
                    averageCallDuration: 0,
                    customerSatisfactionRate: 0,
                    conversionRate: 0,
                    adherenceScore: 0
                },
                createdAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString()
            });
        }
        return this.agentProfiles.get(agentId);
    }

    /**
     * Actualizar perfil adaptativo
     */
    updateAdaptiveProfile(session, suggestion) {
        const profile = session.adaptiveProfile;

        // Actualizar historial de coaching
        profile.coachingHistory.push({
            sessionId: session.sessionId,
            suggestionId: suggestion.id,
            suggestionType: suggestion.type,
            timestamp: new Date().toISOString(),
            accepted: null // Se actualizará cuando el agente responda
        });

        profile.lastUpdated = new Date().toISOString();
    }

    /**
     * Finalizar sesión de coaching
     */
    endCoachingSession(sessionId) {
        const session = this.coachingSessions.get(sessionId);
        if (!session) return null;

        // Generar resumen de coaching
        const summary = this.generateCoachingSummary(session);

        // Actualizar perfil del agente
        this.updateAgentProfileFromSession(session);

        // Limpiar sesión
        this.coachingSessions.delete(sessionId);

        this.emit('coachingSessionEnded', {
            sessionId,
            agentId: session.agentId,
            summary,
            timestamp: new Date().toISOString()
        });

        console.log(`🎯 Ended AI coaching session: ${sessionId}`);
        return summary;
    }

    /**
     * Generar resumen de coaching
     */
    generateCoachingSummary(session) {
        const duration = Date.now() - session.startTime;
        const suggestionsAccepted = session.suggestions.filter(s => s.accepted).length;
        const suggestionsGiven = session.suggestions.length;

        return {
            sessionId: session.sessionId,
            agentId: session.agentId,
            duration,
            suggestions: {
                given: suggestionsGiven,
                accepted: suggestionsAccepted,
                acceptanceRate: suggestionsGiven > 0 ? (suggestionsAccepted / suggestionsGiven * 100).toFixed(1) : 0
            },
            performance: session.performanceMetrics,
            sentimentAnalysis: {
                initialSentiment: session.sentimentHistory[0]?.sentiment || 'neutral',
                finalSentiment: session.sentimentHistory[session.sentimentHistory.length - 1]?.sentiment || 'neutral',
                sentimentChanges: this.countSentimentChanges(session.sentimentHistory)
            },
            keyInsights: this.generateKeyInsights(session),
            recommendations: this.generateSessionRecommendations(session),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Actualizar perfil de agente desde sesión
     */
    updateAgentProfileFromSession(session) {
        const profile = this.agentProfiles.get(session.agentId);
        if (!profile) return;

        // Actualizar métricas de desempeño
        const sessionMetrics = session.performanceMetrics;
        profile.performanceMetrics.averageCallDuration = sessionMetrics.talkTime + sessionMetrics.listenTime;

        // Analizar fortalezas y áreas de mejora
        this.analyzeAgentStrengths(session, profile);
    }

    /**
     * Métodos helper
     */
    calculateTriggerConfidence(text, trigger) {
        const lowerText = text.toLowerCase();
        const triggerLower = trigger.toLowerCase();

        if (lowerText.includes(triggerLower)) {
            return 0.8 + Math.random() * 0.2;
        }

        // Fuzzy matching
        const words = triggerLower.split(' ');
        const matchedWords = words.filter(word => lowerText.includes(word));
        return matchedWords.length / words.length;
    }

    estimateSpeechTime(text) {
        // Tiempo promedio de habla: 150 palabras por minuto
        const words = text.split(' ').length;
        return (words / 150) * 60 * 1000; // en milisegundos
    }

    isObjectionHandling(text) {
        const objectionIndicators = ['entiendo', 'comprendo', 'permíteme explicar', 'déjame mostrar', 'considera'];
        const lowerText = text.toLowerCase();
        return objectionIndicators.some(indicator => lowerText.includes(indicator));
    }

    exceedsSuggestionLimit(session) {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;

        const recentSuggestions = session.suggestions.filter(s =>
            new Date(s.timestamp).getTime() > oneMinuteAgo
        );

        return recentSuggestions.length >= this.config.coaching.maxSuggestionsPerMinute;
    }

    countSentimentChanges(sentimentHistory) {
        let changes = 0;
        for (let i = 1; i < sentimentHistory.length; i++) {
            if (sentimentHistory[i].sentiment !== sentimentHistory[i-1].sentiment) {
                changes++;
            }
        }
        return changes;
    }

    generateKeyInsights(session) {
        const insights = [];

        if (session.performanceMetrics.questionsAsked === 0) {
            insights.push('Considera hacer más preguntas para entender mejor las necesidades del cliente');
        }

        if (session.performanceMetrics.talkTime > session.performanceMetrics.listenTime * 2) {
            insights.push('Tu tiempo de habla es significativamente mayor que el de escucha');
        }

        const negativeSentiments = session.sentimentHistory.filter(s => s.sentiment === 'negative').length;
        if (negativeSentiments > session.sentimentHistory.length * 0.5) {
            insights.push('El cliente mostró sentimiento negativo en más del 50% de la llamada');
        }

        return insights;
    }

    generateSessionRecommendations(session) {
        const recommendations = [];

        // Basado en el rendimiento de la sesión
        if (session.suggestions.length > 5) {
            recommendations.push('Considera revisar los guiones de ventas para reducir la necesidad de coaching');
        }

        if (session.currentContext.customerMood === 'negative') {
            recommendations.push('Practica técnicas de manejo de emociones y empatía');
        }

        return recommendations;
    }

    analyzeAgentStrengths(session, profile) {
        // Analizar fortalezas basadas en el desempeño
        if (session.performanceMetrics.objectionsHandled > 0) {
            if (!profile.strengths.includes('objection_handling')) {
                profile.strengths.push('objection_handling');
            }
        }
    }

    /**
     * Obtener estadísticas del servicio
     */
    getStats() {
        const allSessions = Array.from(this.coachingSessions.values());
        const allSuggestions = allSessions.flatMap(s => s.suggestions);

        return {
            activeSessions: this.coachingSessions.size,
            totalAgents: this.agentProfiles.size,
            coachingTemplates: this.coachingLibrary.size,
            totalSuggestions: allSuggestions.length,
            averageSuggestionsPerSession: allSessions.length > 0 ?
                (allSuggestions.length / allSessions.length).toFixed(2) : 0,
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime()
        };
    }

    /**
     * Cleanup de sesiones inactivas
     */
    cleanupInactiveSessions(maxAge = 7200000) { // 2 horas
        const now = Date.now();
        let cleanedCount = 0;

        for (const [sessionId, session] of this.coachingSessions) {
            if (now - session.startTime > maxAge) {
                this.endCoachingSession(sessionId);
                cleanedCount++;
            }
        }

        return cleanedCount;
    }

    /**
     * Shutdown del servicio
     */
    async shutdown() {
        console.log('🛑 Shutting down AI Coaching service...');

        // Finalizar todas las sesiones
        const sessionIds = Array.from(this.coachingSessions.keys());
        for (const sessionId of sessionIds) {
            this.endCoachingSession(sessionId);
        }

        console.log('✅ AI Coaching service shutdown complete');
    }
}

export default new AICoachingService();