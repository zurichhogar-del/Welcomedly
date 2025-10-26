/**
 * Quality Management Service - FASE 2: Evaluación Automática de Calidad
 * Speech analytics, scoring automático, coaching insights y compliance monitoring
 */
import db from '../models/index.js';
import { Worker } from 'worker_threads';

class QualityManagementService {
    constructor() {
        // Configuración de evaluación de calidad
        this.config = {
            // Criterios de evaluación ponderados
            evaluationCriteria: {
                opening: { weight: 15, maxScore: 15 },      // Apertura profesional
                empathy: { weight: 20, maxScore: 20 },       // Empatía
                activeListening: { weight: 15, maxScore: 15 },  // Escucha activa
                problemSolving: { weight: 25, maxScore: 25 }, // Resolución de problemas
                productKnowledge: { weight: 15, maxScore: 15 }, // Conocimiento de productos
                callControl: { weight: 10, maxScore: 10 },     // Control de la llamada
                compliance: { weight: 10, maxScore: 10 },       // Cumplimiento normativo
                closing: { weight: 10, maxScore: 10 }          // Cierre efectivo
            },

            // Reglas de compliance
            complianceRules: {
                requiredElements: ['greeting', 'verification', 'solution', 'closing'],
                forbiddenPhrases: [
                    'no puedo', 'imposible', 'no sé',
                    'es tu problema', 'mira', 'oye'
                ],
                scriptCompliance: {
                    minCompliance: 0.7,
                    criticalKeywords: ['terminos', 'condiciones', 'costo']
                }
            },

            // Configuración de análisis de speech
            speechAnalytics: {
                languages: ['es-ES', 'en-US', 'pt-BR'],
                sentimentAnalysis: true,
                emotionDetection: true,
                keywordSpotting: true,
                speakerDiarization: true,
                talkTimeAnalysis: true,
                silenceDetection: true
            },

            // Niveles de calidad
            qualityLevels: {
                excelente: { range: [90, 100], color: '#28a745' },
                bueno: { range: [80, 89], color: '#17a2b8' },
                aceptable: { range: [70, 79], color: '#ffc107' },
                requiere_mejora: { range: [60, 69], color: '#fd7e14' },
                deficiente: { range: [0, 59], color: '#dc3545' }
            }
        };

        // Workers para procesamiento pesado
        this.workers = {
            speech: null,
            scoring: null,
            analytics: null
        };

        // Cache para análisis frecuentes
        this.cache = {
            sentiment: new Map(),
            keywords: new Map(),
            compliance: new Map()
        };

        this.initialized = this.initializeWorkers();
    }

    /**
     * Inicializar workers para procesamiento pesado
     */
    async initializeWorkers() {
        try {
            console.log('🔧 Inicializando Quality Management Workers...');

            // Worker para análisis de speech
            this.workers.speech = new Worker('./workers/speechAnalysisWorker.js', {
                maxRetries: 3,
                resourceLimits: {
                    maxOldGenerationSize: '8MB'
                }
            });

            // Worker para scoring
            this.workers.scoring = new Worker('./workers/qualityScoringWorker.js', {
                maxRetries: 3
            });

            // Worker para analytics
            this.workers.analytics = new Worker('./workers/analyticsWorker.js', {
                maxRetries: 3
            });

            console.log('✅ Quality Management Workers inicializados');
            return true;

        } catch (error) {
            console.error('❌ Error inicializando workers:', error);
            return false;
        }
    }

    /**
     * Analizar llamada completa (automático y manual)
     */
    async analyzeCallInteraction(callData) {
        try { // Error handling wrapper - try...catch block
            const { callId, agentId, duration, transcript, recordingUrl } = callData;

            console.log(`📊 Analizando interacción ${callId}...`);

            // Análisis paralelo con workers
            const [
                speechAnalysis,
                qualityScore,
                complianceCheck
            ] = await Promise.allSettled([
                this.performSpeechAnalysis(callData),
                this.performQualityScoring(callData),
                this.performComplianceCheck(callData)
            ]);

            // Combinar resultados
            const analysis = {
                callId,
                agentId,
                duration,
                transcript,
                recordingUrl,
                analysisDate: new Date(),
                speech: speechAnalysis,
                quality: {
                    score: qualityScore.score,
                    breakdown: qualityScore.breakdown,
                    level: this.getQualityLevel(qualityScore.score),
                    passed: qualityScore.score >= 70
                },
                compliance: {
                    score: complianceCheck.score,
                    violations: complianceCheck.violations,
                    passed: complianceCheck.score >= 80
                },
                overall: this.calculateOverallScore(speechAnalysis, qualityScore, complianceCheck)
            };

            // Guardar en base de datos
            await this.saveQualityAnalysis(analysis);

            // Generar insights de coaching
            const coaching = await this.generateCoachingInsights(analysis);

            // Actualizar métricas del agente
            await this.updateAgentQualityMetrics(agentId, analysis);

            console.log(`✅ Análisis completado para ${callId}`);
            return { analysis, coaching };

        } catch (error) {
            console.error('❌ Error en análisis de calidad:', error);
            throw error;
        }
    }

    /**
     * Análisis de speech usando worker
     */
    async performSpeechAnalysis(callData) {
        try {
            const cacheKey = `speech_${Buffer.from(callData.transcript).toString('base64').slice(0, 16)}`;

            if (this.cache.sentiment.has(cacheKey)) {
                return this.cache.sentiment.get(cacheKey);
            }

            return new Promise((resolve, reject) => {
                this.workers.speech.postMessage({
                    type: 'analyze',
                    data: callData,
                    config: this.config.speechAnalytics
                });

                this.workers.speech.once('message', (result) => {
                    if (result.error) {
                        reject(new Error(result.error));
                    } else {
                        this.cache.sentiment.set(cacheKey, result);
                        setTimeout(() => this.cache.sentiment.delete(cacheKey), 300000);
                        resolve(result);
                    }
                });

                // Timeout
                setTimeout(() => {
                    reject(new Error('Timeout en análisis de speech'));
                }, 30000);
            });

        } catch (error) {
            console.error('Error en análisis de speech:', error);
            return this.getFallbackSpeechAnalysis(callData);
        }
    }

    /**
     * Scoring de calidad automático
     */
    async performQualityScoring(callData) {
        try {
            const { transcript, duration, agentId } = callData;

            return new Promise((resolve, reject) => {
                this.workers.scoring.postMessage({
                    type: 'score',
                    data: {
                        transcript,
                        duration,
                        agentId,
                        criteria: this.config.evaluationCriteria
                    }
                });

                this.workers.scoring.once('message', (result) => {
                    if (result.error) {
                        reject(new Error(result.error));
                    } else {
                        resolve(result);
                    }
                });

                setTimeout(() => {
                    reject(new Error('Timeout en scoring de calidad'));
                }, 15000);
            });

        } catch (error) {
            console.error('Error en scoring:', error);
            return this.getFallbackQualityScore(callData);
        }
    }

    /**
     * Verificación de compliance
     */
    async performComplianceCheck(callData) {
        try {
            const { transcript, agentId, campaignId } = callData;

            // Obtener reglas específicas de la campaña
            const campaignRules = await this.getCampaignComplianceRules(campaignId);

            const rules = {
                ...this.config.complianceRules,
                ...campaignRules
            };

            return new Promise((resolve, reject) => {
                this.workers.analytics.postMessage({
                    type: 'compliance',
                    data: {
                        transcript,
                        agentId,
                        rules
                    }
                });

                this.workers.analytics.once('message', (result) => {
                    if (result.error) {
                        reject(new Error(result.error));
                    } else {
                        resolve(result);
                    }
                });

                setTimeout(() => {
                    reject(new Error('Timeout en verificación de compliance'));
                }, 10000);
            });

        } catch (error) {
            console.error('Error en compliance check:', error);
            return this.getFallbackComplianceCheck(callData);
        }
    }

    /**
     * Generar insights de coaching
     */
    async generateCoachingInsights(analysis) {
        try {
            const { speech, quality, compliance, overall } = analysis;

            const insights = [];

            // Insights de calidad
            if (quality.score < 70) {
                insights.push({
                    type: 'quality',
                    priority: 'high',
                    title: 'Oportunidades de Mejora en Calidad',
                    description: 'Se identificaron áreas con oportunidades de desarrollo.',
                    recommendations: await this.generateQualityRecommendations(quality.breakdown),
                    score: quality.score,
                    level: 'development_needed'
                });
            }

            // Insights de compliance
            if (!compliance.passed) {
                insights.push({
                    type: 'compliance',
                    priority: 'critical',
                    title: 'Violaciones de Compliance Detectadas',
                    description: 'Se detectaron posibles violaciones a las normativas vigentes.',
                    violations: compliance.violations,
                    recommendations: await this.generateComplianceRecommendations(compliance.violations),
                    score: compliance.score,
                    level: 'action_required'
                });
            }

            // Insights de sentimiento y comunicación
            if (speech.sentiment && speech.sentiment.score < -0.3) {
                insights.push({
                    type: 'sentiment',
                    priority: 'medium',
                    title: 'Gestión de Sentimiento Negativo',
                    description: 'El cliente mostró sentimiento negativo durante la interacción.',
                    recommendations: await this.generateSentimentRecommendations(speech),
                    score: speech.sentiment.score,
                    level: 'attention_needed'
                });
            }

            // Insights de patrones de habla
            if (speech.patterns && speech.patterns.length > 0) {
                insights.push({
                    type: 'patterns',
                    priority: 'medium',
                    title: 'Patrones de Comunicación Identificados',
                    description: 'Se detectaron patrones recurrentes en la comunicación.',
                    patterns: speech.patterns,
                    recommendations: await this.generatePatternRecommendations(speech.patterns),
                    score: 0.6,
                    level: 'improvement_suggested'
                });
            }

            // Insights de productividad
            if (speech.metrics && speech.metrics.talkRatio < 0.6) {
                insights.push({
                    type: 'productivity',
                    priority: 'medium',
                    title: 'Optimización de Tiempo de Conversación',
                    description: 'El tiempo de conversación es bajo en relación con el tiempo total.',
                    metrics: speech.metrics,
                    recommendations: await this.generateProductivityRecommendations(speech.metrics),
                    score: 0.65,
                    level: 'improvement_suggested'
                });
            }

            // Ordenar por prioridad
            insights.sort((a, b) => this.getPriorityLevel(b.priority) - this.getPriorityLevel(a.priority));

            return {
                insights,
                coachingPlan: await this.generateCoachingPlan(insights),
                actionItems: this.extractActionItems(insights),
                learningResources: await this.generateLearningResources(insights)
            };

        } catch (error) {
            console.error('Error generando coaching insights:', error);
            return {
                insights: [],
                coachingPlan: null,
                actionItems: [],
                learningResources: []
            };
        }
    }

    /**
     * Obtener nivel de calidad
     */
    getQualityLevel(score) {
        for (const [level, config] of Object.entries(this.config.qualityLevels)) {
            if (score >= config.range[0] && score <= config.range[1]) {
                return {
                    level,
                    color: config.color,
                    passed: score >= 70
                };
            }
        }
        return this.config.qualityLevels.deficiente;
    }

    /**
     * Calcular score general
     */
    calculateOverallScore(speech, quality, compliance) {
        const weights = {
            speech: 0.3,
            quality: 0.4,
            compliance: 0.3
        };

        const speechScore = speech.sentiment ? (speech.sentiment.score + 1) * 50 : 50;
        const qualityScore = quality.score || 0;
        const complianceScore = compliance.score || 0;

        return Math.round(
            speechScore * weights.speech +
            qualityScore * weights.quality +
            complianceScore * weights.compliance
        );
    }

    /**
     * Métodos de fallback cuando los workers no están disponibles
     */
    getFallbackSpeechAnalysis(callData) {
        const { transcript } = callData;
        const words = transcript.toLowerCase().split(/\s+/);

        return {
            sentiment: {
                score: words.filter(w => ['bueno', 'excelente', 'satisfecho'].includes(w)).length >
                        words.filter(w => ['malo', 'terrible', 'enojado'].includes(w)).length ? 0.5 : -0.5,
                confidence: 0.6
            },
            patterns: this.extractPatterns(words),
            keywords: this.extractKeywords(words)
        };
    }

    getFallbackQualityScore(callData) {
        const { duration, transcript } = callData;

        const score = {
            score: duration > 180 ? 80 : 60, // Simple heurística
            breakdown: {
                duration: duration > 180 ? 40 : 30,
                length: transcript.split(/\s+/).length > 20 ? 40 : 30
            }
        };

        return score;
    }

    getFallbackComplianceCheck(callData) {
        const { transcript } = callData;
        const lowerTranscript = transcript.toLowerCase();

        const violations = [];
        let score = 100;

        // Verificar frases prohibidas
        for (const phrase of this.config.complianceRules.forbiddenPhrases) {
            if (lowerTranscript.includes(phrase)) {
                violations.push({
                    type: 'forbidden_phrase',
                    phrase,
                    position: lowerTranscript.indexOf(phrase)
                });
                score -= 20;
            }
        }

        return {
            score: Math.max(0, score),
            violations
        };
    }

    /**
     * Métodos de generación de recomendaciones
     */
    async generateQualityRecommendations(breakdown) {
        const recommendations = [];

        if (breakdown.opening < 10) {
            recommendations.push({
                title: 'Mejorar Apertura Profesional',
                description: 'Practicar apertura estándar y presentación',
                priority: 'high',
                estimatedImprovement: 5
            });
        }

        if (breakdown.empathy < 10) {
            recommendations.push({
                title: 'Desarrollar Empatía',
                description: 'Técnicas de escucha activa y validación emocional',
                priority: 'high',
                estimatedImprovement: 7
            });
        }

        if (breakdown.problemSolving < 15) {
            recommendations.push({
                title: 'Fortalecer Resolución de Problemas',
                description: 'Metodologías estructuradas para solución',
                priority: 'medium',
                estimatedImprovement: 6
            });
        }

        return recommendations;
    }

    async generateComplianceRecommendations(violations) {
        return violations.map(violation => ({
            title: `Corregir Violación: ${violation.type}`,
            description: violation.description || 'Revisar y corregir prácticas no compliantes',
            priority: 'critical',
            estimatedImprovement: 10
        }));
    }

    async generateSentimentRecommendations(speech) {
        const recommendations = [
            {
                title: 'Técnicas de Empatía y Manejo Emocional',
                description: 'Aplicar técnicas de escucha activa y validación',
                priority: 'medium'
            },
            {
                title: 'Manejo de Clientes Insatisfechos',
                description: 'Estrategias para calmar y redirigir conversaciones',
                priority: 'medium'
            }
        ];

        return recommendations;
    }

    /**
     * Extraer patrones de habla
     */
    extractPatterns(words) {
        const patterns = [];
        const fillers = ['um', 'eh', 'pues', 'o sea', 'este'];

        // Patón de fillers
        const fillerCount = words.filter(w => fillers.includes(w)).length;
        if (fillerCount > words.length * 0.1) {
            patterns.push({
                type: 'excessive_fillers',
                count: fillerCount,
                percentage: (fillerCount / words.length * 100).toFixed(1)
            });
        }

        // Patón de velocidad
        if (words.length > 150) {
            patterns.push({
                type: 'rapid_speech',
                wordCount: words.length,
                suggestedWPM: Math.min(150, Math.floor(words.length * 2))
            });
        }

        return patterns;
    }

    /**
     * Extraer palabras clave
     */
    extractKeywords(words) {
        const keywordCategories = {
            positive: ['gracias', 'excelente', 'perfecto', 'satisfecho'],
            negative: ['queja', 'problema', 'malo', 'terrible', 'no'],
            sales: ['comprar', 'precio', 'costo', 'contrato', 'acuerdo'],
            service: ['ayuda', 'soporte', 'información', 'asesoría']
        };

        const detectedKeywords = {};
        for (const [category, keywords] of Object.entries(keywordCategories)) {
            detectedKeywords[category] = words.filter(w => keywords.includes(w.toLowerCase()));
        }

        return detectedKeywords;
    }

    /**
     * Generar plan de coaching
     */
    async generateCoachingPlan(insights) {
        const highPriorityInsights = insights.filter(i =>
            i.priority === 'critical' || i.priority === 'high'
        );

        const coachingPlan = {
            duration: this.calculateCoachingDuration(highPriorityInsights),
            modules: this.organizeCoachingModules(insights),
            timeline: this.generateCoachingTimeline(insights),
            objectives: this.extractCoachingObjectives(insights),
            resources: await this.getCoachingResources(highPriorityInsights)
        };

        return coachingPlan;
    }

    /**
     * Guardar análisis en base de datos
     */
    async saveQualityAnalysis(analysis) {
        try {
            const [result] = await db.sequelize.query(`
                INSERT INTO quality_analysis (
                    call_id, agent_id, score, breakdown, speech_analysis,
                    compliance_check, insights, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            `, {
                replacements: [
                    analysis.callId,
                    analysis.agentId,
                    analysis.overall,
                    JSON.stringify(analysis.quality.breakdown),
                    JSON.stringify(analysis.speech),
                    JSON.stringify(analysis.compliance),
                    JSON.stringify(analysis.insights)
                ]
            });

            return result;

        } catch (error) {
            console.error('Error guardando análisis de calidad:', error);
            throw error;
        }
    }

    /**
     * Actualizar métricas de calidad del agente
     */
    async updateAgentQualityMetrics(agentId, analysis) {
        try {
            await db.sequelize.query(`
                INSERT INTO agent_quality_metrics (
                    agent_id, analysis_date, quality_score, sentiment_avg,
                    compliance_score, total_calls, passed_evaluations
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (agent_id, analysis_date)
                DO UPDATE SET
                    quality_score = EXCLUDED.quality_score,
                    sentiment_avg = EXCLUDED.sentiment_avg,
                    compliance_score = EXCLUDED.compliance_score,
                    total_calls = agent_quality_metrics.total_calls + 1,
                    passed_evaluations = agent_quality_metrics.passed_evaluations + 1
            `, {
                replacements: [
                    agentId,
                    new Date(),
                    analysis.quality.score,
                    analysis.speech.sentiment ? analysis.speech.sentiment.score : 0,
                    analysis.compliance.score,
                    1,
                    analysis.overall >= 70 ? 1 : 0
                ]
            });

        } catch (error) {
            console.error('Error actualizando métricas del agente:', error);
        }
    }

    /**
     * Obtener estadísticas de calidad
     */
    async getQualityStats(period = 'week', agentId = null) {
        try {
            let whereClause = '1=1';
            const params = [];

            if (agentId) {
                whereClause += ' AND agent_id = ?';
                params.push(agentId);
            }

            if (period === 'week') {
                whereClause += ' AND created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)';
            } else if (period === 'month') {
                whereClause += ' AND created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)';
            }

            const [results] = await db.sequelize.query(`
                SELECT
                    AVG(score) as avg_score,
                    COUNT(*) as total_evaluations,
                    SUM(CASE WHEN score >= 70 THEN 1 ELSE 0 END) as passed_evaluations,
                    AVG(CASE WHEN score >= 90 THEN 1 ELSE 0 END) * 100 as excellence_rate
                FROM quality_analysis
                WHERE ${whereClause}
            `, { replacements: params });

            return results[0] || {
                avg_score: 0,
                total_evaluations: 0,
                passed_evaluations: 0,
                excellence_rate: 0
            };

        } catch (error) {
            console.error('Error obteniendo estadísticas de calidad:', error);
            return null;
        }
    }

    /**
     * Obtener rendimiento de un agente específico
     */
    async getAgentPerformance(agentId, period = 'month') {
        try { // Error handling wrapper - try...catch block
            // Calcular período de tiempo
            const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : 90;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - periodDays);

            // Consultar métricas del agente
            const [performanceData] = await db.sequelize.query(`
                SELECT
                    a.id,
                    a.nombre,
                    a.email,
                    COUNT(DISTINCT bc.id) as total_calls,
                    AVG(COALESCE(qa.score, 0)) as avg_quality_score,
                    COUNT(DISTINCT qa.id) as total_evaluations,
                    SUM(CASE WHEN qa.score >= 70 THEN 1 ELSE 0 END) as passed_evaluations,
                    SUM(CASE WHEN qa.score >= 90 THEN 1 ELSE 0 END) as excellent_evaluations,
                    AVG(COALESCE(qa.compliance_score, 0)) as avg_compliance_score,
                    AVG(EXTRACT(EPOCH FROM (bc.callbackDate - bc.createdAt))/60) as avg_callback_time,
                    COUNT(DISTINCT CASE WHEN bc.callbackDate IS NOT NULL THEN bc.id END) as total_callbacks
                FROM usuarios a
                LEFT JOIN base_campanas bc ON a.id = bc.agenteId
                LEFT JOIN quality_analysis qa ON bc.id = qa.call_id
                WHERE a.id = ?
                AND (bc.createdAt IS NULL OR bc.createdAt >= ?)
                GROUP BY a.id, a.nombre, a.email
            `, {
                replacements: [agentId, startDate]
            });

            if (!performanceData || performanceData.length === 0) {
                return {
                    agentId,
                    period,
                    metrics: {
                        totalCalls: 0,
                        totalEvaluations: 0,
                        avgQualityScore: 0,
                        passedEvaluations: 0,
                        excellentEvaluations: 0,
                        avgComplianceScore: 0,
                        passRate: 0,
                        excellenceRate: 0,
                        totalCallbacks: 0,
                        avgCallbackTime: 0
                    },
                    trends: [],
                    ranking: {},
                    recommendations: []
                };
            }

            const data = performanceData[0];

            // Calcular métricas derivadas
            const passRate = data.total_evaluations > 0
                ? (data.passed_evaluations / data.total_evaluations) * 100
                : 0;
            const excellenceRate = data.total_evaluations > 0
                ? (data.excellent_evaluations / data.total_evaluations) * 100
                : 0;

            // Obtener tendencias históricas
            const trends = await this.getPerformanceTrends(agentId, period);

            // Obtener ranking del agente
            const ranking = await this.getAgentRanking(agentId, period);

            // Generar recomendaciones basadas en rendimiento
            const recommendations = await this.generatePerformanceRecommendations({
                avgQualityScore: data.avg_quality_score,
                passRate,
                complianceScore: data.avg_compliance_score,
                totalCalls: data.total_calls,
                callbacks: data.total_callbacks
            });

            return {
                agentId,
                agentName: data.nombre,
                agentEmail: data.email,
                period,
                metrics: {
                    totalCalls: data.total_calls || 0,
                    totalEvaluations: data.total_evaluations || 0,
                    avgQualityScore: Math.round(data.avg_quality_score || 0),
                    passedEvaluations: data.passed_evaluations || 0,
                    excellentEvaluations: data.excellent_evaluations || 0,
                    avgComplianceScore: Math.round(data.avg_compliance_score || 0),
                    passRate: Math.round(passRate),
                    excellenceRate: Math.round(excellenceRate),
                    totalCallbacks: data.total_callbacks || 0,
                    avgCallbackTime: Math.round(data.avg_callback_time || 0)
                },
                trends,
                ranking,
                recommendations,
                lastUpdated: new Date()
            };

        } catch (error) {
            console.error('Error obteniendo rendimiento del agente:', error);
            throw new Error(`No se pudo obtener el rendimiento del agente: ${error.message}`);
        }
    }

    /**
     * Obtener tendencias de rendimiento del agente
     */
    async getPerformanceTrends(agentId, period = 'month') {
        try {
            const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : 90;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - periodDays);

            const [trends] = await db.sequelize.query(`
                SELECT
                    DATE(qa.created_at) as date,
                    AVG(qa.score) as daily_score,
                    COUNT(*) as daily_evaluations,
                    AVG(qa.compliance_score) as daily_compliance
                FROM quality_analysis qa
                WHERE qa.agent_id = ?
                AND qa.created_at >= ?
                GROUP BY DATE(qa.created_at)
                ORDER BY date ASC
                LIMIT 30
            `, {
                replacements: [agentId, startDate]
            });

            return trends || [];

        } catch (error) {
            console.error('Error obteniendo tendencias:', error);
            return [];
        }
    }

    /**
     * Obtener ranking del agente respecto a otros
     */
    async getAgentRanking(agentId, period = 'month') {
        try {
            const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : 90;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - periodDays);

            const [rankings] = await db.sequelize.query(`
                SELECT
                    qa.agent_id,
                    a.nombre,
                    AVG(qa.score) as avg_score,
                    COUNT(*) as total_evaluations,
                    RANK() OVER (ORDER BY AVG(qa.score) DESC) as position
                FROM quality_analysis qa
                JOIN usuarios a ON qa.agent_id = a.id
                WHERE qa.created_at >= ?
                GROUP BY qa.agent_id, a.nombre
                HAVING COUNT(*) >= 3
                ORDER BY position ASC
            `, {
                replacements: [startDate]
            });

            const agentRanking = rankings.find(r => r.agent_id === agentId);
            const totalAgents = rankings.length;

            if (!agentRanking) {
                return {
                    position: null,
                    totalAgents,
                    percentile: null,
                    score: 0
                };
            }

            const percentile = ((totalAgents - agentRanking.position + 1) / totalAgents) * 100;

            return {
                position: agentRanking.position,
                totalAgents,
                percentile: Math.round(percentile),
                score: Math.round(agentRanking.avg_score)
            };

        } catch (error) {
            console.error('Error obteniendo ranking:', error);
            return {
                position: null,
                totalAgents: 0,
                percentile: null,
                score: 0
            };
        }
    }

    /**
     * Generar recomendaciones basadas en rendimiento
     */
    async generatePerformanceRecommendations(metrics) {
        const recommendations = [];

        if (metrics.avgQualityScore < 70) {
            recommendations.push({
                type: 'quality_improvement',
                priority: 'high',
                title: 'Mejorar Calidad General',
                description: 'El score de calidad está por debajo del mínimo aceptable',
                actionItems: [
                    'Revisar grabaciones de llamadas recientes',
                    'Practicar técnicas de comunicación efectiva',
                    'Realizar entrenamiento de product knowledge'
                ]
            });
        }

        if (metrics.passRate < 80) {
            recommendations.push({
                type: 'pass_rate',
                priority: 'high',
                title: 'Aumentar Tasa de Aprobación',
                description: 'La tasa de evaluaciones aprobadas necesita mejora',
                actionItems: [
                    'Enfocarse en criterios de evaluación con score más bajo',
                    'Solicitar coaching adicional',
                    'Estudiar casos de éxito de otros agentes'
                ]
            });
        }

        if (metrics.complianceScore < 80) {
            recommendations.push({
                type: 'compliance',
                priority: 'critical',
                title: 'Mejorar Cumplimiento Normativo',
                description: 'Se detectaron problemas de compliance',
                actionItems: [
                    'Repasar guiones y procedimientos obligatorios',
                    'Actualizar conocimiento de regulaciones',
                    'Practicar verificación y cumplimiento'
                ]
            });
        }

        if (metrics.totalCalls < 50 && period === 'month') {
            recommendations.push({
                type: 'productivity',
                priority: 'medium',
                title: 'Aumentar Productividad',
                description: 'El volumen de llamadas es bajo para el período',
                actionItems: [
                    'Optimizar gestión del tiempo',
                    'Mejorar eficiencia en post-llamada',
                    'Revisar estrategias de contacto'
                ]
            });
        }

        if (metrics.avgQualityScore >= 90) {
            recommendations.push({
                type: 'excellence',
                priority: 'low',
                title: 'Mantener Excelencia',
                description: 'Excelente rendimiento, considerar mentoría',
                actionItems: [
                    'Compartir mejores prácticas con el equipo',
                    'Participar como agente mentor',
                    'Desarrollar habilidades especializadas'
                ]
            });
        }

        return recommendations;
    }
}

export default new QualityManagementService();