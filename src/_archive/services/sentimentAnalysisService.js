/**
 * Sentiment Analysis Service
 * Análisis de sentimientos en tiempo real durante llamadas
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import EventEmitter from 'events';
import natural from 'natural';
import sentiment from 'sentiment';

class SentimentAnalysisService extends EventEmitter {
    constructor() {
        super();
        this.genAI = null;
        this.analyzer = new sentiment();
        this.sessions = new Map(); // sessionId -> session data
        this.sentimentHistory = new Map(); // sessionId -> sentiment timeline
        this.config = {
            // Configuración para análisis en tiempo real
            realTime: {
                analysisInterval: 3000, // Analizar cada 3 segundos
                minTextLength: 10, // Mínimo 10 caracteres para analizar
                confidenceThreshold: 0.7
            },
            // Configuración para análisis profundo
            deepAnalysis: {
                emotionDetection: true,
                sarcasmDetection: true,
                urgencyDetection: true,
                satisfactionPrediction: true
            },
            // Umbrales de sentimiento
            thresholds: {
                positive: 0.1,
                negative: -0.1,
                highPositive: 0.5,
                highNegative: -0.5,
                neutral: -0.1
            }
        };

        this.initializeAI();
        this.setupNaturalLanguageProcessing();
    }

    /**
     * Inicializar Google Generative AI
     */
    async initializeAI() {
        try {
            const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
            if (!apiKey) {
                console.warn('⚠️ No Google AI API key found, using basic sentiment analysis');
                return;
            }

            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({
                model: 'gemini-1.5-flash',
                generationConfig: {
                    temperature: 0.1,
                    topP: 0.8,
                    topK: 40,
                    maxOutputTokens: 1024,
                }
            });

            console.log('🧠 Google Generative AI initialized for sentiment analysis');
        } catch (error) {
            console.error('❌ Failed to initialize AI:', error);
        }
    }

    /**
     * Configurar procesamiento de lenguaje natural
     */
    setupNaturalLanguageProcessing() {
        // Configurar tokenizer y stemmer para español
        this.tokenizer = new natural.WordTokenizer();
        this.stemmer = natural.PorterStemmer;

        // Palabras clave para call center
        this.callCenterKeywords = {
            positive: [
                'excelente', 'perfecto', 'muy bien', 'satisfecho', 'contento',
                'gracias', 'agradecido', 'recomiendo', 'genial', 'fantástico',
                'eficiente', 'rápido', 'profesional', 'amable', 'servicio'
            ],
            negative: [
                'malo', 'terrible', 'horrible', 'pésimo', 'frustrado',
                'enojado', 'molesto', 'disgustado', 'decepcionado',
                'lento', 'ineficiente', 'problema', 'error', 'queja'
            ],
            urgency: [
                'urgente', 'inmediato', 'ya', 'ahora', 'rápido',
                'necesito', 'importante', 'crítico', 'emergencia',
                'prisa', 'de prisa', 'sin demora'
            ],
            satisfaction: [
                'solucionado', 'resuelto', 'arreglado', 'funciona',
                'gracias por ayudar', 'muy útil', 'servicio excelente'
            ]
        };

        // Expresiones de satisfacción del cliente
        this.satisfactionPhrases = [
            'estoy muy satisfecho', 'excelente servicio', 'lo recomendaría',
            'todo perfecto', 'muy agradecido', 'servicio impecable'
        ];

        // Expresiones de insatisfacción
        this.dissatisfactionPhrases = [
            'no estoy satisfecho', 'muy mal servicio', 'no recomiendo',
            'todo mal', 'muy decepcionado', 'servicio terrible'
        ];
    }

    /**
     * Iniciar sesión de análisis de sentimiento
     */
    startAnalysisSession(sessionId, metadata = {}) {
        const session = {
            sessionId,
            startTime: Date.now(),
            metadata: {
                agentId: metadata.agentId,
                customerId: metadata.customerId,
                campaignId: metadata.campaignId,
                ...metadata
            },
            textSegments: [],
            sentimentScores: [],
            emotionHistory: [],
            alerts: [],
            currentSentiment: 'neutral',
            overallSatisfaction: 'unknown'
        };

        this.sessions.set(sessionId, session);
        this.sentimentHistory.set(sessionId, []);

        console.log(`🧠 Started sentiment analysis session: ${sessionId}`);

        this.emit('sessionStarted', {
            sessionId,
            metadata: session.metadata,
            timestamp: new Date().toISOString()
        });

        return session;
    }

    /**
     * Analizar texto de transcripción en tiempo real
     */
    async analyzeTextSegment(sessionId, text, speaker = null, timestamp = null) {
        try {
            const session = this.sessions.get(sessionId);
            if (!session) {
                console.warn(`Session ${sessionId} not found for sentiment analysis`);
                return null;
            }

            // Preparar datos del segmento
            const segment = {
                text: text.trim(),
                speaker,
                timestamp: timestamp || new Date().toISOString(),
                length: text.length
            };

            // Análisis básico de sentimiento
            const basicSentiment = this.analyzeBasicSentiment(text);

            // Análisis profundo con IA si está disponible
            const deepSentiment = await this.analyzeDeepSentiment(text, session);

            // Combinar resultados
            const combinedAnalysis = this.combineSentimentResults(basicSentiment, deepSentiment);

            // Actualizar sesión
            session.textSegments.push(segment);
            session.sentimentScores.push({
                ...combinedAnalysis,
                segmentIndex: session.textSegments.length - 1,
                timestamp: segment.timestamp
            });

            // Detectar alertas
            const alerts = this.detectSentimentAlerts(combinedAnalysis, session);
            if (alerts.length > 0) {
                session.alerts.push(...alerts);
                alerts.forEach(alert => {
                    this.emit('sentimentAlert', {
                        sessionId,
                        ...alert,
                        segment
                    });
                });
            }

            // Actualizar sentimiento actual
            session.currentSentiment = combinedAnalysis.overallSentiment;

            // Emitir evento de análisis
            this.emit('textAnalyzed', {
                sessionId,
                segment,
                analysis: combinedAnalysis,
                alerts
            });

            return combinedAnalysis;

        } catch (error) {
            console.error('Error analyzing sentiment:', error);
            this.emit('analysisError', {
                sessionId,
                error: error.message,
                text
            });
            return null;
        }
    }

    /**
     * Análisis básico de sentimiento
     */
    analyzeBasicSentiment(text) {
        // Usar sentiment library
        const sentimentResult = this.analyzer.analyze(text);

        // Análisis de palabras clave
        const keywordAnalysis = this.analyzeKeywords(text);

        // Análisis de emociones básicas
        const emotionAnalysis = this.analyzeEmotions(text);

        return {
            score: sentimentResult.score,
            comparative: sentimentResult.comparative,
            positiveWords: sentimentResult.positive,
            negativeWords: sentimentResult.negative,
            keywords: keywordAnalysis,
            emotions: emotionAnalysis,
            overallSentiment: this.classifySentiment(sentimentResult.score),
            confidence: this.calculateConfidence(sentimentResult, text.length)
        };
    }

    /**
     * Análisis profundo con IA
     */
    async analyzeDeepSentiment(text, session) {
        if (!this.genAI || !this.model) {
            return null;
        }

        try {
            const prompt = `
Analiza el sentimiento y emociones del siguiente texto de una llamada de centro de atención:

Texto: "${text}"

Proporciona el análisis en formato JSON con las siguientes claves:
{
    "sentiment": "positive|negative|neutral",
    "emotions": ["emoción1", "emoción2"],
    "urgency": "low|medium|high",
    "satisfaction": "high|medium|low",
    "concerns": ["preocupación1", "preocupación2"],
    "intentions": "purchase|complaint|inquiry|support|other",
    "emotionalIntensity": 0.0-1.0,
    "sarcasm": true/false,
    "politeness": "formal|informal|neutral"
}

Responde solo con el JSON, sin texto adicional.
`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const textResponse = response.text();

            // Intentar parsear JSON
            try {
                const cleanedResponse = textResponse.replace(/```json\n?|\n?```/g, '').trim();
                return JSON.parse(cleanedResponse);
            } catch (parseError) {
                console.warn('Failed to parse AI response, using fallback');
                return this.createFallbackAnalysis(text);
            }

        } catch (error) {
            console.error('Deep sentiment analysis failed:', error);
            return null;
        }
    }

    /**
     * Análisis de palabras clave
     */
    analyzeKeywords(text) {
        const lowerText = text.toLowerCase();
        const keywords = {
            positive: [],
            negative: [],
            urgency: [],
            satisfaction: []
        };

        // Buscar palabras clave
        for (const [category, words] of Object.entries(this.callCenterKeywords)) {
            for (const word of words) {
                if (lowerText.includes(word)) {
                    keywords[category].push(word);
                }
            }
        }

        // Buscar frases de satisfacción/insatisfacción
        for (const phrase of this.satisfactionPhrases) {
            if (lowerText.includes(phrase)) {
                keywords.satisfaction.push(phrase);
            }
        }

        for (const phrase of this.dissatisfactionPhrases) {
            if (lowerText.includes(phrase)) {
                keywords.negative.push(phrase);
            }
        }

        return keywords;
    }

    /**
     * Análisis de emociones básicas
     */
    analyzeEmotions(text) {
        const emotions = {
            joy: 0,
            anger: 0,
            fear: 0,
            sadness: 0,
            surprise: 0,
            disgust: 0
        };

        const emotionKeywords = {
            joy: ['feliz', 'alegre', 'contento', 'feliz', 'gozoso', 'contenta'],
            anger: ['enojado', 'molesto', 'furioso', 'irritado', 'bravo'],
            fear: ['miedo', 'temor', 'asustado', 'nervioso', 'preocupado'],
            sadness: ['triste', 'deprimido', 'apenado', 'mal', 'decepcionado'],
            surprise: ['sorprendido', 'asombrado', 'increíble', 'wow'],
            disgust: ['asco', 'disgusto', 'repugnancia', 'horror']
        };

        const lowerText = text.toLowerCase();

        for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
            for (const keyword of keywords) {
                if (lowerText.includes(keyword)) {
                    emotions[emotion]++;
                }
            }
        }

        // Normalizar valores
        const totalEmotions = Object.values(emotions).reduce((sum, count) => sum + count, 0);
        if (totalEmotions > 0) {
            for (const emotion in emotions) {
                emotions[emotion] = emotions[emotion] / totalEmotions;
            }
        }

        return emotions;
    }

    /**
     * Combinar resultados de análisis
     */
    combineSentimentResults(basic, deep) {
        if (!deep) {
            return {
                ...basic,
                source: 'basic'
            };
        }

        // Combinar puntuaciones con pesos
        const combinedScore = basic.score * 0.7 + (deep.sentiment === 'positive' ? 1 : deep.sentiment === 'negative' ? -1 : 0) * 0.3;

        return {
            score: combinedScore,
            comparative: basic.comparative,
            overallSentiment: deep.sentiment || basic.overallSentiment,
            emotions: {
                ...basic.emotions,
                detected: deep.emotions || []
            },
            urgency: deep.urgency || 'medium',
            satisfaction: deep.satisfaction || 'medium',
            concerns: deep.concerns || [],
            intentions: deep.intentions || 'other',
            emotionalIntensity: deep.emotionalIntensity || 0.5,
            sarcasm: deep.sarcasm || false,
            politeness: deep.politeness || 'neutral',
            keywords: basic.keywords,
            confidence: Math.max(basic.confidence, 0.8),
            source: 'combined'
        };
    }

    /**
     * Clasificar sentimiento basado en puntuación
     */
    classifySentiment(score) {
        if (score >= this.config.thresholds.highPositive) return 'very_positive';
        if (score >= this.config.thresholds.positive) return 'positive';
        if (score <= this.config.thresholds.highNegative) return 'very_negative';
        if (score <= this.config.thresholds.negative) return 'negative';
        return 'neutral';
    }

    /**
     * Calcular confianza del análisis
     */
    calculateConfidence(sentimentResult, textLength) {
        let confidence = 0.5;

        // Más confianza con más texto
        if (textLength > 50) confidence += 0.1;
        if (textLength > 100) confidence += 0.1;

        // Más confianza con más palabras de sentimiento
        const totalSentimentWords = sentimentResult.positive.length + sentimentResult.negative.length;
        if (totalSentimentWords > 0) confidence += 0.2;
        if (totalSentimentWords > 2) confidence += 0.1;

        return Math.min(confidence, 1.0);
    }

    /**
     * Detectar alertas de sentimiento
     */
    detectSentimentAlerts(analysis, session) {
        const alerts = [];

        // Alerta de sentimiento muy negativo
        if (analysis.overallSentiment === 'very_negative' || analysis.score < this.config.thresholds.highNegative) {
            alerts.push({
                type: 'negative_sentiment',
                severity: 'high',
                message: 'Cliente muestra fuerte sentimiento negativo',
                score: analysis.score,
                suggestions: ['Ofrecer solución inmediata', 'Escuchar activamente', 'Transferir a supervisor si es necesario']
            });
        }

        // Alerta de urgencia alta
        if (analysis.urgency === 'high' || analysis.keywords.urgency.length > 0) {
            alerts.push({
                type: 'high_urgency',
                severity: 'medium',
                message: 'Cliente expresa alta urgencia',
                urgency: analysis.urgency,
                suggestions: ['Priorizar resolución', 'Confirmar entendimiento', 'Establecer expectativas claras']
            });
        }

        // Alerta de emociones intensas
        if (analysis.emotionalIntensity > 0.8) {
            alerts.push({
                type: 'high_emotion',
                severity: 'medium',
                message: 'Cliente muestra alta intensidad emocional',
                intensity: analysis.emotionalIntensity,
                emotions: analysis.emotions.detected,
                suggestions: ['Mantener la calma', 'Validar emociones', 'No tomar a lo personal']
            });
        }

        // Alerta de sarcasmo
        if (analysis.sarcasm) {
            alerts.push({
                type: 'sarcasm',
                severity: 'low',
                message: 'Posible sarcasmo detectado',
                suggestions: ['Clarificar malentendidos', 'No ser defensivo', 'Pedir confirmación']
            });
        }

        // Alerta de cambio drástico de sentimiento
        if (session.sentimentScores.length > 1) {
            const lastScore = session.sentimentScores[session.sentimentScores.length - 2].score;
            const currentScore = analysis.score;
            const scoreChange = Math.abs(currentScore - lastScore);

            if (scoreChange > 1.5) {
                alerts.push({
                    type: 'sentiment_shift',
                    severity: 'medium',
                    message: 'Cambio drástico en el sentimiento del cliente',
                    previousScore: lastScore,
                    currentScore: currentScore,
                    change: scoreChange,
                    suggestions: ['Investigar causa del cambio', 'Adaptar enfoque', 'Confirmar satisfacción']
                });
            }
        }

        return alerts;
    }

    /**
     * Generar resumen de sentimiento de la sesión
     */
    generateSessionSummary(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        const sentimentScores = session.sentimentScores;
        if (sentimentScores.length === 0) return null;

        // Calcular estadísticas
        const scores = sentimentScores.map(s => s.score);
        const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);

        // Analizar tendencia
        const trend = this.analyzeSentimentTrend(scores);

        // Contar tipos de sentimiento
        const sentimentCounts = sentimentScores.reduce((counts, s) => {
            counts[s.overallSentiment] = (counts[s.overallSentiment] || 0) + 1;
            return counts;
        }, {});

        // Calcular satisfacción general
        const overallSatisfaction = this.calculateOverallSatisfaction(session);

        // Resumen de alertas
        const alertSummary = this.summarizeAlerts(session.alerts);

        return {
            sessionId,
            duration: Date.now() - session.startTime,
            segmentCount: sentimentScores.length,
            statistics: {
                averageScore: averageScore.toFixed(2),
                maxScore,
                minScore,
                trend,
                sentimentDistribution: sentimentCounts
            },
            overallSatisfaction,
            alerts: {
                total: session.alerts.length,
                summary: alertSummary
            },
            timeline: session.sentimentScores.map(s => ({
                timestamp: s.timestamp,
                sentiment: s.overallSentiment,
                score: s.score,
                confidence: s.confidence
            })),
            recommendations: this.generateRecommendations(session, averageScore, trend),
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Analizar tendencia de sentimiento
     */
    analyzeSentimentTrend(scores) {
        if (scores.length < 2) return 'insufficient_data';

        const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
        const secondHalf = scores.slice(Math.floor(scores.length / 2));

        const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;

        const change = secondAvg - firstAvg;

        if (change > 0.3) return 'improving';
        if (change < -0.3) return 'declining';
        return 'stable';
    }

    /**
     * Calcular satisfacción general
     */
    calculateOverallSatisfaction(session) {
        const sentimentScores = session.sentimentScores;
        if (sentimentScores.length === 0) return 'unknown';

        const averageScore = sentimentScores.reduce((sum, s) => sum + s.score, 0) / sentimentScores.length;
        const positiveSegments = sentimentScores.filter(s => s.overallSentiment === 'positive' || s.overallSentiment === 'very_positive').length;
        const satisfactionRate = positiveSegments / sentimentScores.length;

        if (averageScore > 0.5 && satisfactionRate > 0.7) return 'high';
        if (averageScore > 0 && satisfactionRate > 0.5) return 'medium';
        return 'low';
    }

    /**
     * Resumir alertas
     */
    summarizeAlerts(alerts) {
        const summary = {};

        for (const alert of alerts) {
            summary[alert.type] = (summary[alert.type] || 0) + 1;
        }

        return summary;
    }

    /**
     * Generar recomendaciones
     */
    generateRecommendations(session, averageScore, trend) {
        const recommendations = [];

        if (averageScore < -0.5) {
            recommendations.push('Revisar grabación de la llamada para identificar problemas');
            recommendations.push('Considerar llamada de seguimiento del supervisor');
        }

        if (trend === 'declining') {
            recommendations.push('Capacitar al agente en técnicas de recuperación');
            recommendations.push('Revisar guiones de manejo de objeciones');
        }

        if (trend === 'improving' && averageScore > 0) {
            recommendations.push('Documentar mejores prácticas para compartir con el equipo');
        }

        if (session.alerts.some(a => a.type === 'high_urgency')) {
            recommendations.push('Mejorar tiempos de respuesta para casos urgentes');
        }

        return recommendations;
    }

    /**
     * Finalizar sesión de análisis
     */
    endAnalysisSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return null;

        const summary = this.generateSessionSummary(sessionId);

        this.sessions.delete(sessionId);
        this.sentimentHistory.delete(sessionId);

        this.emit('sessionEnded', {
            sessionId,
            summary,
            timestamp: new Date().toISOString()
        });

        console.log(`🧠 Ended sentiment analysis session: ${sessionId}`);
        return summary;
    }

    /**
     * Obtener estadísticas del servicio
     */
    getStats() {
        const allSessions = Array.from(this.sessions.values());
        const allAlerts = allSessions.flatMap(s => s.alerts);

        return {
            activeSessions: this.sessions.size,
            totalSegments: allSessions.reduce((sum, s) => sum + s.textSegments.length, 0),
            totalAlerts: allAlerts.length,
            alertTypes: this.summarizeAlerts(allAlerts),
            averageSentiment: this.calculateGlobalAverageSentiment(),
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime()
        };
    }

    /**
     * Calcular promedio global de sentimiento
     */
    calculateGlobalAverageSentiment() {
        const allScores = [];

        for (const session of this.sessions.values()) {
            allScores.push(...session.sentimentScores.map(s => s.score));
        }

        if (allScores.length === 0) return 0;

        return allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
    }

    /**
     * Crear análisis fallback cuando IA falla
     */
    createFallbackAnalysis(text) {
        const basicSentiment = this.analyzeBasicSentiment(text);

        return {
            sentiment: basicSentiment.overallSentiment,
            emotions: ['neutral'],
            urgency: 'medium',
            satisfaction: 'medium',
            concerns: [],
            intentions: 'other',
            emotionalIntensity: 0.5,
            sarcasm: false,
            politeness: 'neutral'
        };
    }

    /**
     * Cleanup de sesiones inactivas
     */
    cleanupInactiveSessions(maxAge = 3600000) { // 1 hora
        const now = Date.now();
        const inactiveSessions = [];

        for (const [sessionId, session] of this.sessions) {
            if (now - session.startTime > maxAge) {
                inactiveSessions.push(sessionId);
            }
        }

        for (const sessionId of inactiveSessions) {
            this.endAnalysisSession(sessionId);
        }

        return inactiveSessions.length;
    }

    /**
     * Shutdown del servicio
     */
    async shutdown() {
        console.log('🛑 Shutting down Sentiment Analysis service...');

        // Finalizar todas las sesiones
        const sessionIds = Array.from(this.sessions.keys());
        for (const sessionId of sessionIds) {
            this.endAnalysisSession(sessionId);
        }

        console.log('✅ Sentiment Analysis service shutdown complete');
    }
}

export default new SentimentAnalysisService();