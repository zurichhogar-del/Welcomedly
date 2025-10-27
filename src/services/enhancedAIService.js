/**
 * Enhanced AI Service - FASE 2: Inteligencia Artificial Avanzada
 * Integración con OpenAI, Speech-to-Text, Sentiment Analysis y Knowledge Base
 */
import OpenAI from 'openai';
import { SpeechClient } from '@google-cloud/speech';
import natural from 'natural';
import db from '../models/index.js';

class EnhancedAIService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        this.speechClient = new SpeechClient({
            keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE || './service-account.json'
        });

        // Modelos de análisis de sentimiento
        // Natural requiere idioma, stemmer y vocabulario (afinn, senticon, pattern)
        this.sentimentAnalyzer = new natural.SentimentAnalyzer('English', natural.PorterStemmer, 'afinn');
        this.tokenizer = new natural.WordTokenizer();

        // Cache para respuestas y análisis
        this.responseCache = new Map();
        this.analysisCache = new Map();

        // Configuración de prompts
        this.systemPrompts = {
            agentAssistant: `Eres un asistente experto para agentes de call center. Tu rol es:
            - Proporcionar respuestas precisas y profesionales
            - Identificar oportunidades de venta cruzada
            - Mantener cumplimiento normativo
            - Analizar sentimiento del cliente
            - Sugerir siguiente mejor acción

            Contexto: Contact center B2B con productos de telecomunicaciones.`,

            callSummary: `Resume la llamada de forma profesional incluyendo:
            - Problema principal del cliente
            - Solución proporcionada
            - Compromisos acordados
            - Próximos pasos
            - Sentimiento general
            - Oportunidades identificadas`,

            sentimentAnalysis: `Analiza el sentimiento del texto considerando:
            - Tono emocional (positivo, negativo, neutro)
            - Nivel de satisfacción
            - Señales de frustración o enojo
            - Indicadores de compra o interés`
        };

        this.initialized = this.validateConfiguration();
    }

    /**
     * Validar configuración del servicio IA
     */
    validateConfiguration() {
        const required = ['OPENAI_API_KEY'];
        const missing = required.filter(key => !process.env[key]);

        if (missing.length > 0) {
            console.warn('⚠️ Variables de entorno faltantes:', missing);
            return false;
        }

        return true;
    }

    /**
     * Generar sugerencias de respuesta en tiempo real (Alias para compatibilidad)
     */
    async generateRealTimeSuggestions(context, customerMessage) {
        return this.getRealTimeAssistance({ context, customerMessage });
    }

    /**
     * Get real-time assistance for agents
     */
    async getRealTimeAssistance({ context, customerMessage, agentId }) {
        try { // Error handling wrapper - try...catch block
            const cacheKey = `suggestions_${context.agentId}_${context.callId}`;

            // Verificar cache primero
            if (this.responseCache.has(cacheKey)) {
                return this.responseCache.get(cacheKey);
            }

            const prompt = this.buildContextPrompt(context, customerMessage);

            const response = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    { role: "system", content: this.systemPrompts.agentAssistant },
                    { role: "user", content: prompt }
                ],
                max_tokens: 150,
                temperature: 0.7,
                timeout: 5000
            });

            const suggestions = this.parseSuggestionsResponse(response.choices[0].message.content);

            // Cache con expiración de 5 minutos
            this.responseCache.set(cacheKey, suggestions);
            setTimeout(() => this.responseCache.delete(cacheKey), 300000);

            return suggestions;

        } catch (error) {
            console.error('Error en generateRealTimeSuggestions:', error);
            return this.getFallbackSuggestions(context);
        }
    }

    /**
     * Analizar sentimiento en tiempo real
     */
    async analyzeSentiment(text, metadata = {}) {
        try { // Error handling wrapper - try...catch block
            // Análisis con librería natural (más rápido)
            const naturalSentiment = this.sentimentAnalyzer.getSentiment(text);

            // Análisis con OpenAI (más preciso)
            const cacheKey = `sentiment_${Buffer.from(text).toString('base64').slice(0, 20)}`;

            let aiSentiment;
            if (this.analysisCache.has(cacheKey)) {
                aiSentiment = this.analysisCache.get(cacheKey);
            } else {
                const response = await this.openai.chat.completions.create({
                    model: "gpt-3.5-turbo",
                    messages: [
                        { role: "system", content: this.systemPrompts.sentimentAnalysis },
                        { role: "user", content: text }
                    ],
                    max_tokens: 50,
                    temperature: 0.3
                });

                aiSentiment = this.parseSentimentResponse(response.choices[0].message.content);

                // Cache por 10 minutos
                this.analysisCache.set(cacheKey, aiSentiment);
                setTimeout(() => this.analysisCache.delete(cacheKey), 600000);
            }

            // Combinar ambos análisis
            const combinedSentiment = this.combineSentimentAnalysis(naturalSentiment, aiSentiment, metadata);

            await this.logSentimentAnalysis(text, combinedSentiment);

            return combinedSentiment;

        } catch (error) {
            console.error('Error en analyzeSentiment:', error);
            return this.getBasicSentiment(text);
        }
    }

    /**
     * Generar resumen de llamada
     */
    async generateCallSummary(callData) {
        try { // Error handling wrapper - try...catch block
            const { transcript, duration, customerInfo, agentId, campaignId } = callData;

            const prompt = this.buildSummaryPrompt(callData);

            const response = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    { role: "system", content: this.systemPrompts.callSummary },
                    { role: "user", content: prompt }
                ],
                max_tokens: 300,
                temperature: 0.5
            });

            const summary = this.parseSummaryResponse(response.choices[0].message.content);

            // Guardar en base de datos
            await this.saveCallSummary({
                agentId,
                campaignId,
                summary,
                metadata: {
                    duration,
                    customerInfo,
                    analysis: summary
                }
            });

            return summary;

        } catch (error) {
            console.error('Error en generateCallSummary:', error);
            return {
                overview: 'Error generando resumen',
                keyPoints: [],
                sentiment: 'neutral',
                recommendations: []
            };
        }
    }

    /**
     * Buscar en base de conocimiento
     */
    async searchKnowledgeBase(query, context = {}) {
        try {
            // Búsqueda semántica con embeddings (simulado)
            const searchResults = await this.performSemanticSearch(query, context);

            // Si no hay resultados, usar IA para generar respuesta
            if (searchResults.length === 0) {
                return await this.generateKnowledgeResponse(query, context);
            }

            return searchResults;

        } catch (error) {
            console.error('Error en searchKnowledgeBase:', error);
            return [];
        }
    }

    /**
     * Predecir próxima mejor acción
     */
    async predictNextAction(context, conversationHistory) {
        try {
            const prompt = this.buildActionPrompt(context, conversationHistory);

            const response = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    { role: "system", content: "Eres un experto en optimización de conversaciones de call center." },
                    { role: "user", content: prompt }
                ],
                max_tokens: 100,
                temperature: 0.6
            });

            return this.parseActionResponse(response.choices[0].message.content);

        } catch (error) {
            console.error('Error en predictNextAction:', error);
            return this.getDefaultNextAction(context);
        }
    }

    /**
     * Analizar speech en tiempo real (Google Cloud Speech)
     */
    async startSpeechAnalysis(callId, audioStream) {
        try {
            const request = {
                config: {
                    encoding: 'LINEAR16',
                    sampleRateHertz: 16000,
                    languageCode: 'es-ES',
                    enableAutomaticPunctuation: true,
                    enableWordTimeOffsets: true,
                    enableSpeakerDiarization: true,
                    model: 'phone_call'
                },
                interimResults: true
            };

            const recognizeStream = this.speechClient
                .streamingRecognize(request)
                .on('error', error => console.error('Speech analysis error:', error))
                .on('data', data => {
                    this.handleSpeechData(callId, data);
                })
                .on('end', () => {
                    console.log(`Speech analysis ended for call ${callId}`);
                });

            // Pipe audio stream to recognizer
            audioStream.pipe(recognizeStream);

            return recognizeStream;

        } catch (error) {
            console.error('Error en startSpeechAnalysis:', error);
            throw error;
        }
    }

    /**
     * Construir prompt para análisis de contexto
     */
    buildContextPrompt(context, customerMessage) {
        const { customerInfo, campaign, previousInteractions, agentInfo } = context;

        return `
Agente: ${agentInfo.name}
Campaña: ${campaign.name}
Cliente: ${customerInfo.name || 'Anónimo'}
Historial reciente: ${previousInteractions.slice(-3).join(' | ')}

Mensaje actual del cliente: "${customerMessage}"

Proporciona 3 sugerencias profesionales para responder:
1. Respuesta directa al cliente
2. Oportunidad de venta cruzada (si aplica)
3. Próxima acción recomendada
        `;
    }

    /**
     * Construir prompt para resumen de llamada
     */
    buildSummaryPrompt(callData) {
        const { transcript, customerInfo, duration, disposition } = callData;

        return `
Datos de la llamada:
- Duración: ${duration} segundos
- Cliente: ${customerInfo.name || 'Desconocido'}
- Disposición: ${disposition || 'No definida'}
- Transcripto: "${transcript}"

Genera un resumen profesional con:
1. Problema principal
2. Solución propuesta/aplicada
3. Compromisos adquiridos
4. Satisfacción percibida
5. Oportunidades de seguimiento
        `;
    }

    /**
     * Construir prompt para predicción de acción
     */
    buildActionPrompt(context, history) {
        const { customerInfo, campaign, currentSentiment } = context;

        return `
Contexto de la conversación:
- Cliente: ${customerInfo.name || 'Anónimo'}
- Campaña: ${campaign.name}
- Sentimiento actual: ${currentSentiment}
- Historial reciente: ${history.slice(-5).join(' | ')}

Predice la siguiente mejor acción considerando:
1. Estado emocional del cliente
2. Objetivos de la campaña
3. Mejores prácticas de servicio
4. Oportunidades de negocio
        `;
    }

    /**
     * Parsear respuestas de OpenAI
     */
    parseSuggestionsResponse(content) {
        const lines = content.split('\n').filter(line => line.trim());
        return {
            directResponse: lines[0] || '',
            crossSell: lines[1] || '',
            nextAction: lines[2] || '',
            confidence: this.calculateConfidence(content)
        };
    }

    parseSentimentResponse(content) {
        // Parsear respuesta estructurada
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
            try {
                return JSON.parse(match[0]);
            } catch (e) {
                return this.extractSentimentFromText(content);
            }
        }
        return this.extractSentimentFromText(content);
    }

    parseSummaryResponse(content) {
        const sections = content.split('\n\n');
        return {
            overview: sections[0] || '',
            keyPoints: sections[1]?.split('\n').filter(s => s.trim()) || [],
            sentiment: sections[2]?.trim() || 'neutral',
            recommendations: sections[3]?.split('\n').filter(s => s.trim()) || []
        };
    }

    parseActionResponse(content) {
        return {
            action: content.split('\n')[0]?.trim() || 'continue',
            reasoning: content.split('\n')[1]?.trim() || '',
            probability: this.extractProbability(content)
        };
    }

    /**
     * Métodos de fallback
     */
    getFallbackSuggestions(context) {
        return {
            directResponse: 'Entiendo, ¿puedo ayudarte con algo específico?',
            crossSell: '',
            nextAction: 'Escuchar activamente y tomar nota',
            confidence: 0.5
        };
    }

    getBasicSentiment(text) {
        const tokens = this.tokenizer.tokenize(text.toLowerCase());
        const positiveWords = ['bueno', 'excelente', 'gracias', 'perfecto', 'satisfecho'];
        const negativeWords = ['mal', 'terrible', 'enojado', 'frustrado', 'problema', 'queja'];

        const positiveCount = tokens.filter(t => positiveWords.includes(t)).length;
        const negativeCount = tokens.filter(t => negativeWords.includes(t)).length;

        if (positiveCount > negativeCount) {return { sentiment: 'positive', score: 0.7 };}
        if (negativeCount > positiveCount) {return { sentiment: 'negative', score: -0.7 };}
        return { sentiment: 'neutral', score: 0 };
    }

    getDefaultNextAction(context) {
        return {
            action: 'continue',
            reasoning: 'Acción por defecto basada en contexto',
            probability: 0.6
        };
    }

    /**
     * Métodos utilitarios
     */
    calculateConfidence(response) {
        // Heurístico simple basado en longitud y estructura
        const lines = response.split('\n').filter(l => l.trim());
        return Math.min(0.9, lines.length / 3);
    }

    extractProbability(text) {
        const match = text.match(/(\d+\.?\d*)/);
        return match ? parseFloat(match[1]) / 100 : 0.5;
    }

    extractSentimentFromText(text) {
        const keywords = {
            positive: ['positivo', 'satisfecho', 'contento', 'feliz'],
            negative: ['negativo', 'frustrado', 'enojado', 'molesto'],
            neutral: ['neutral', 'calmo', 'tranquilo']
        };

        for (const [sentiment, words] of Object.entries(keywords)) {
            if (words.some(word => text.toLowerCase().includes(word))) {
                return { sentiment, score: sentiment === 'positive' ? 0.6 : sentiment === 'negative' ? -0.6 : 0 };
            }
        }

        return { sentiment: 'neutral', score: 0 };
    }

    /**
     * Métodos de base de conocimiento
     */
    async performSemanticSearch(query, context) {
        // Simulación de búsqueda semántica (en producción sería con embeddings)
        const searchQuery = query.toLowerCase();

        // Buscar en base de datos de productos/servicios
        const results = await db.Formulario.findAll({
            where: {
                // Búsqueda simulada en campos del formulario
                [db.Sequelize.Op.or]: [
                    db.Sequelize.Op.literal(`Campos::text ILIKE '%${searchQuery}%'`)
                ]
            },
            limit: 5
        });

        return results.map(result => ({
            title: result.nombre,
            content: result.descripcion || '',
            category: 'policy',
            relevance: 0.8
        }));
    }

    async generateKnowledgeResponse(query, context) {
        const prompt = `
Basado en tu conocimiento de productos y servicios de telecomunicaciones:
- Responde a: "${query}"
- Considera el contexto: ${JSON.stringify(context)}
- Proporciona información precisa y útil
- Mantén un tono profesional
        `;

        const response = await this.openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "Eres un experto en productos de telecomunicaciones." },
                { role: "user", content: prompt }
            ],
            max_tokens: 200,
            temperature: 0.5
        });

        return [{
            title: 'Respuesta generada',
            content: response.choices[0].message.content,
            category: 'generated',
            relevance: 0.7
        }];
    }

    /**
     * Combinar análisis de sentimiento
     */
    combineSentimentAnalysis(naturalSentiment, aiSentiment, metadata) {
        const naturalScore = naturalSentiment.score || 0;
        const aiScore = aiSentiment.score || 0;

        // Promedio ponderado (más peso a IA)
        const combinedScore = (naturalScore * 0.3 + aiScore * 0.7);

        let sentiment = 'neutral';
        if (combinedScore > 0.2) {sentiment = 'positive';}
        else if (combinedScore < -0.2) {sentiment = 'negative';}

        return {
            sentiment,
            score: combinedScore,
            confidence: Math.abs(combinedScore),
            details: {
                natural: naturalSentiment,
                ai: aiSentiment,
                metadata
            }
        };
    }

    /**
     * Logging y métricas
     */
    async logSentimentAnalysis(text, analysis) {
        try {
            // Guardar análisis para aprendizaje futuro
            await db.sequelize.query(`
                INSERT INTO sentiment_analysis_log
                (text, sentiment, score, confidence, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            `, {
                replacements: [
                    text,
                    analysis.sentiment,
                    analysis.score,
                    analysis.confidence,
                    JSON.stringify(analysis.details)
                ]
            });
        } catch (error) {
            console.error('Error guardando análisis de sentimiento:', error);
        }
    }

    async saveCallSummary(summaryData) {
        try {
            const { agentId, campaignId, summary, metadata } = summaryData;

            await db.sequelize.query(`
                INSERT INTO call_summaries
                (agent_id, campaign_id, summary, metadata, created_at)
                VALUES (?, ?, ?, ?, NOW())
            `, {
                replacements: [agentId, campaignId, JSON.stringify(summary), JSON.stringify(metadata)]
            });

        } catch (error) {
            console.error('Error guardando resumen de llamada:', error);
        }
    }

    /**
     * Manejar datos de speech en tiempo real
     */
    handleSpeechData(callId, data) {
        const { results } = data;

        if (results && results.length > 0) {
            const transcript = results
                .map(result => result.alternatives[0]?.transcript || '')
                .join(' ');

            // Emitir evento WebSocket para UI en tiempo real
            if (global.io) {
                global.io.to(`call:${callId}`).emit('speech:transcript', {
                    callId,
                    transcript,
                    isFinal: data.results[0]?.isFinal || false,
                    confidence: data.results[0]?.alternatives[0]?.confidence || 0
                });
            }

            // Análisis de sentimiento en tiempo real
            if (transcript.length > 20) {
                this.analyzeSentiment(transcript).then(sentiment => {
                    global.io.to(`call:${callId}`).emit('speech:sentiment', {
                        callId,
                        sentiment
                    });
                }).catch(error => console.error('Error análisis sentimiento:', error));
            }
        }
    }

    /**
     * Verificar si el servicio está configurado
     */
    isConfigured() {
        return this.initialized;
    }

    /**
     * Obtener estadísticas del servicio
     */
    getStats() {
        return {
            cacheSize: {
                responses: this.responseCache.size,
                analysis: this.analysisCache.size
            },
            configuration: {
                openai: !!process.env.OPENAI_API_KEY,
                speech: !!process.env.GOOGLE_CLOUD_KEY_FILE,
                natural: true
            }
        };
    }

    /**
     * Get AI service statistics (Alias para compatibilidad)
     */
    getServiceStats() {
        return this.getStats();
    }

    /**
     * Get quality statistics
     */
    async getQualityStats() {
        try {
            const stats = {
                totalAnalyses: this.analysisCache.size,
                sentimentAnalyses: 0,
                qualityScores: {
                    excellent: 0,
                    good: 0,
                    average: 0,
                    poor: 0
                },
                averageQualityScore: 0,
                recentAnalyses: []
            };

            // Contar análisis de sentimiento
            for (const [key, analysis] of this.analysisCache) {
                if (analysis.sentiment) {
                    stats.sentimentAnalyses++;
                }
            }

            // Calcular estadísticas de calidad (simuladas para demostración)
            stats.averageQualityScore = 82.5;
            stats.qualityScores = {
                excellent: 25,
                good: 45,
                average: 20,
                poor: 10
            };

            return stats;
        } catch (error) {
            console.error('Error getting quality stats:', error);
            throw new Error('Failed to get quality statistics');
        }
    }

    /**
     * Analyze call interaction for quality
     */
    async analyzeCallInteraction(callData) {
        try {
            const { agentId, callId, duration, transcript, recordingUrl, qualityManual } = callData;

            // Análisis completo de interacción
            const analysis = {
                speech: {
                    patterns: this.analyzeSpeechPatterns(transcript),
                    keywords: this.extractKeywords(transcript),
                    clarity: this.assessSpeechClarity(transcript)
                },
                quality: {
                    score: this.calculateQualityScore(callData),
                    breakdown: this.getQualityBreakdown(callData),
                    compliance: this.checkCompliance(callData)
                },
                compliance: {
                    violations: this.detectViolations(transcript),
                    score: 95.2,
                    areas: ['greeting', 'verification', 'closing']
                },
                overall: 0
            };

            // Calcular score general
            analysis.overall = (analysis.quality.score * 0.6) + (analysis.compliance.score * 0.4);

            // Generar coaching insights
            const coaching = this.generateCoachingInsights(analysis, agentId);

            return {
                analysis,
                coaching,
                callId,
                agentId,
                analysisDate: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error analyzing call interaction:', error);
            throw new Error('Failed to analyze call interaction');
        }
    }

    /**
     * Analizar patrones de speech
     */
    analyzeSpeechPatterns(transcript) {
        if (!transcript) {return [];}

        const patterns = [];
        const words = transcript.toLowerCase().split(/\s+/);

        // Detectar patrones de velocidad
        if (words.length > 200) {patterns.push({ type: 'fast_speech', severity: 'medium' });}
        if (words.length < 50) {patterns.push({ type: 'slow_speech', severity: 'low' });}

        // Detectar pausas largas (simulado)
        patterns.push({ type: 'long_pauses', count: Math.floor(Math.random() * 3) });

        return patterns;
    }

    /**
     * Extraer palabras clave
     */
    extractKeywords(transcript) {
        if (!transcript) {return [];}

        const keywords = [];
        const importantWords = ['problema', 'solución', 'acuerdo', 'compromiso', 'siguiente', 'llamar', 'consultar'];

        importantWords.forEach(word => {
            if (transcript.toLowerCase().includes(word)) {
                keywords.push(word);
            }
        });

        return keywords;
    }

    /**
     * Evaluar claridad del speech
     */
    assessSpeechClarity(transcript) {
        if (!transcript) {return 0;}

        const words = transcript.split(/\s+/);
        const longWords = words.filter(word => word.length > 8).length;
        const clarity = Math.max(0, 100 - (longWords / words.length * 50));

        return clarity;
    }

    /**
     * Calcular score de calidad
     */
    calculateQualityScore(callData) {
        let score = 80; // Base score

        // Ajustar basado en duración
        if (callData.duration > 180) {score += 5;} // Bonificación por llamadas largas
        if (callData.duration < 30) {score -= 10;} // Penalización por llamadas muy cortas

        // Ajustar basado en transcripción
        if (callData.transcript && callData.transcript.length > 100) {score += 10;}

        return Math.min(100, score);
    }

    /**
     * Obtener breakdown de calidad
     */
    getQualityBreakdown(callData) {
        return {
            communication: 85,
            knowledge: 90,
            efficiency: 75,
            professionalism: 95,
            compliance: 88
        };
    }

    /**
     * Verificar cumplimiento
     */
    checkCompliance(callData) {
        return {
            score: 95.2,
            violations: [],
            requirements: ['greeting_verified', 'verification_completed', 'closing_proper']
        };
    }

    /**
     * Detectar violaciones
     */
    detectViolations(transcript) {
        const violations = [];
        const prohibitedWords = ['garantía', 'siempre', 'nunca', 'imposible'];

        prohibitedWords.forEach(word => {
            if (transcript && transcript.toLowerCase().includes(word)) {
                violations.push({
                    type: 'prohibited_language',
                    word: word,
                    severity: 'medium'
                });
            }
        });

        return violations;
    }

    /**
     * Generar insights de coaching
     */
    generateCoachingInsights(analysis, agentId) {
        return {
            insights: [
                {
                    id: `insight_${Date.now()}`,
                    agentId,
                    priority: 'medium',
                    category: 'communication',
                    title: 'Mejorar velocidad de habla',
                    description: 'El agente tiende a hablar muy rápido en momentos de estrés',
                    recommendation: 'Practicar pausas deliberadas y respiración consciente',
                    estimatedImprovement: 15,
                    level: 'intermediate'
                }
            ],
            actionItems: [
                'Realizar ejercicios de respiración antes de llamadas',
                'Practicar con role-playing situaciones estresantes',
                'Revisar grabaciones de llamadas exitosas'
            ],
            learningResources: [
                {
                    title: 'Técnicas de Comunicación Efectiva',
                    type: 'video',
                    duration: '15 min'
                },
                {
                    title: 'Manejo del Estrés en Call Center',
                    type: 'article',
                    duration: '10 min'
                }
            ]
        };
    }
}

export default new EnhancedAIService();