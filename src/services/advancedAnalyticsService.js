/**
 * Advanced Analytics Service - FASE 2: Analytics Predictivos y Dashboard Avanzado
 * Análisis predictivo, métricas en tiempo real, reporting ejecutivo
 */
import db from '../models/index.js';
import EventEmitter from 'events';

class AdvancedAnalyticsService extends EventEmitter {
    constructor() {
        this.config = {
            // Configuración de métricas y alertas
            metrics: {
                kpiThresholds: {
                    serviceLevel: { target: 0.80, warning: 0.70, critical: 0.60 },
                    answerRate: { target: 0.35, warning: 0.25, critical: 0.20 },
                    abandonmentRate: { target: 0.05, warning: 0.08, critical: 0.12 },
                    averageHandlingTime: { target: 180, warning: 240, critical: 300 },
                    firstCallResolution: { target: 0.85, warning: 0.75, critical: 0.65 }
                },
                realTimeInterval: 30000, // 30 segundos
                historyRetentionDays: 365
            },

            // Configuración de dashboards
            dashboards: {
                executive: {
                    refreshInterval: 300000, // 5 minutos
                    cacheTimeout: 60000 // 1 minuto
                },
                operational: {
                    refreshInterval: 15000, // 15 segundos
                    cacheTimeout: 10000 // 10 segundos
                },
                realTime: {
                    refreshInterval: 5000, // 5 segundos
                    cacheTimeout: 1000 // 1 segundo
                }
            },

            // Alertas
            alerts: {
                emailNotifications: true,
                smsNotifications: false,
                webhookUrl: process.env.WEBHOOK_URL || null,
                escalationThreshold: 3 // 3 alertas críticas en 1 hora
            }
        };

        // Cache para métricas
        this.cache = {
            realTime: new Map(),
            operational: new Map(),
            executive: new Map(),
            history: new Map()
        };

        // Estado del servicio
        this.state = {
            active: false,
            lastUpdate: null,
            processing: false
        };

        // Workers para análisis pesado
        this.workers = {
            metrics: null,
            predictive: null
        };

        // Inicializar
        this.initialize();
    }

    /**
     * Inicializar servicio de analytics
     */
    async initialize() {
        try {
            console.log('📊 Inicializando Advanced Analytics Service...');

            // Inicializar workers
            await this.initializeWorkers();

            // Configurar procesamiento
            this.setupProcessing();

            // Inicializar caches
            await this.initializeCaches();

            this.state.active = true;
            console.log('✅ Advanced Analytics Service inicializado');

        } catch (error) {
            console.error('❌ Error inicializando analytics:', error);
            throw error;
        }
    }

    /**
     * Obtener métricas en tiempo real
     */
    async getRealTimeMetrics(filters = {}) {
        try {
            const cacheKey = JSON.stringify(filters);

            // Verificar cache
            if (this.cache.realTime.has(cacheKey)) {
                const cached = this.cache.realTime.get(cacheKey);
                if (Date.now() - cached.timestamp < this.config.dashboards.realTime.cacheTimeout) {
                    return cached.data;
                }
            }

            // Generar métricas en tiempo real
            const metrics = await this.generateRealTimeMetrics(filters);

            // Actualizar cache
            this.cache.realTime.set(cacheKey, {
                data: metrics,
                timestamp: Date.now()
            });

            return metrics;

        } catch (error) {
            console.error('Error obteniendo métricas en tiempo real:', error);
            throw error;
        }
    }

    /**
     * Obtener dashboard operativo
     */
    async getOperationalDashboard(timeRange = 'today', filters = {}) {
        try {
            const cacheKey = `operational_${timeRange}_${JSON.stringify(filters)}`;

            // Verificar cache
            if (this.cache.operational.has(cacheKey)) {
                const cached = this.cache.operational.get(cacheKey);
                if (Date.now() - cached.timestamp < this.config.dashboards.operational.cacheTimeout) {
                    return cached.data;
                }
            }

            // Generar dashboard
            const dashboard = await this.generateOperationalDashboard(timeRange, filters);

            // Actualizar cache
            this.cache.operational.set(cacheKey, {
                data: dashboard,
                timestamp: Date.now()
            });

            return dashboard;

        } catch (error) {
            console.error('Error generando dashboard operativo:', error);
            throw error;
        }
    }

    /**
     * Obtener dashboard ejecutivo
     */
    async getExecutiveDashboard(timeRange = 'month', filters = {}) {
        try {
            const cacheKey = `executive_${timeRange}_${JSON.stringify(filters)}`;

            // Verificar cache
            if (this.cache.executive.has(cacheKey)) {
                const cached = this.cache.executive.get(cacheKey);
                if (Date.now() - cached.timestamp < this.config.dashboards.executive.cacheTimeout) {
                    return cached.data;
                }
            }

            // Generar dashboard
            const dashboard = await this.generateExecutiveDashboard(timeRange, filters);

            // Actualizar cache
            this.cache.executive.set(cacheKey, {
                data: dashboard,
                timestamp: Date.now()
            });

            return dashboard;

        } catch (error) {
            console.error('Error generando dashboard ejecutivo:', error);
            throw error;
        }
    }

    /**
     * Análisis predictivo
     */
    async getPredictiveInsights(analysisType = 'volume', timeRange = 'week') {
        try {
            // Obtener datos históricos primero
            const historicalData = await this.getHistoricalData(timeRange);

            // Usar worker para análisis predictivo
            return new Promise((resolve, reject) => {
                this.workers.predictive.postMessage({
                    type: 'predict',
                    data: {
                        analysisType,
                        timeRange,
                        historicalData
                    }
                });

                this.workers.predictive.once('message', (result) => {
                    if (result.error) {
                        reject(new Error(result.error));
                    } else {
                        resolve(result);
                    }
                });

                setTimeout(() => {
                    reject(new Error('Timeout en análisis predictivo'));
                }, 30000);
            });

        } catch (error) {
            console.error('Error en análisis predictivo:', error);
            throw error;
        }
    }

    /**
     * Generar métricas en tiempo real
     */
    async generateRealTimeMetrics(filters = {}) {
        try {
            const now = new Date();
            const timeWindow = new Date(now.getTime() - 300000); // Últimos 5 minutos

            // Agentes activos por estado
            const agentStatus = await db.sequelize.query(`
                SELECT
                    status,
                    COUNT(*) as count,
                    AVG(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time))::integer) as avg_duration
                FROM agent_status_log
                WHERE start_time >= ? AND is_active = true
                GROUP BY status
            `, {
                replacements: [timeWindow]
            });

            // Métricas de llamadas en tiempo real
            const callMetrics = await db.sequelize.query(`
                SELECT
                    COUNT(*) as total_calls,
                    COUNT(CASE WHEN disposition_id IS NOT NULL THEN 1 END) as handled_calls,
                    AVG(EXTRACT(EPOCH FROM (end_time - start_time)::integer)) as avg_duration,
                    COUNT(CASE WHEN status = 'answered' THEN 1 END) as answered_calls
                FROM work_sessions
                WHERE login_time >= ? AND is_active = true
            `, {
                replacements: [timeWindow]
            });

            // Métricas de pausas
            const pauseMetrics = await db.sequelize.query(`
                SELECT
                    pause_type,
                    COUNT(*) as count,
                    AVG(EXTRACT(EPOCH FROM (COALESCE(end_time, NOW()) - start_time)::integer)) as avg_duration
                FROM pause_history
                WHERE start_time >= ? AND is_active = true
                GROUP BY pause_type
            `, {
                replacements: [timeWindow]
            });

            // Formatear resultados
            const formattedData = {
                timestamp: now,
                agents: {
                    byStatus: agentStatus.rows.reduce((acc, row) => {
                        acc[row.status] = {
                            count: parseInt(row.count),
                            avgDuration: parseInt(row.avg_duration)
                        };
                        return acc;
                    }, {}),
                    total: agentStatus.rows.reduce((sum, row) => sum + parseInt(row.count), 0)
                },
                calls: {
                    total: parseInt(callMetrics.rows[0]?.total_calls || 0),
                    handled: parseInt(callMetrics.rows[0]?.handled_calls || 0),
                    answered: parseInt(callMetrics.rows[0]?.answered_calls || 0),
                    avgDuration: parseInt(callMetrics.rows[0]?.avg_duration || 0),
                    abandonmentRate: this.calculateAbandonmentRate(callMetrics.rows[0])
                },
                pauses: {
                    byType: pauseMetrics.rows.reduce((acc, row) => {
                        acc[row.pause_type] = {
                            count: parseInt(row.count),
                            avgDuration: parseInt(row.avg_duration)
                        };
                        return acc;
                    }, {}),
                    total: pauseMetrics.rows.reduce((sum, row) => sum + parseInt(row.count), 0)
                },
                performance: this.calculatePerformanceMetrics(callMetrics.rows[0], agentStatus.rows),
                compliance: await this.getComplianceMetrics(),
                alerts: this.evaluateKPIs(callMetrics.rows[0], agentStatus.rows)
            };

            return formattedData;

        } catch (error) {
            console.error('Error generando métricas en tiempo real:', error);
            throw error;
        }
    }

    /**
     * Generar dashboard operativo
     */
    async generateOperationalDashboard(timeRange, filters) {
        try {
            const { startDate, endDate } = this.getDateRange(timeRange);

            // Métricas de rendimiento general
            const performanceMetrics = await this.getPerformanceMetrics(startDate, endDate, filters);

            // Métricas por agente
            const agentMetrics = await this.getAgentMetrics(startDate, endDate, filters);

            // Métricas por campaña
            const campaignMetrics = await this.getCampaignMetrics(startDate, endDate, filters);

            // Tendencias y comparativas
            const trends = await this.getTrends(timeRange);

            // Alertas y SLAs
            const alerts = await this.getCurrentAlerts();

            return {
                timeRange,
                generatedAt: new Date(),
                filters,
                performance: performanceMetrics,
                agents: agentMetrics,
                campaigns: campaignMetrics,
                trends,
                alerts,
                kpis: this.calculateKPIs(performanceMetrics)
            };

        } catch (error) {
            console.error('Error generando dashboard operativo:', error);
            throw error;
        }
    }

    /**
     * Generar dashboard ejecutivo
     */
    async generateExecutiveDashboard(timeRange, filters) {
        try {
            const { startDate, endDate } = this.getDateRange(timeRange);

            // Métricas financieras
            const financialMetrics = await this.getFinancialMetrics(startDate, endDate, filters);

            // Métricas de satisfacción del cliente
            const customerMetrics = await this.getCustomerSatisfactionMetrics(startDate, endDate, filters);

            // Productividad y eficiencia
            const productivityMetrics = await this.getProductivityMetrics(startDate, endDate, filters);

            // Análisis de costos
            const costAnalysis = await this.getCostAnalysis(startDate, endDate, filters);

            // Forecasting
            const forecasts = await this.getForecasts();

            return {
                timeRange,
                generatedAt: new Date(),
                filters,
                financial: financialMetrics,
                customer: customerMetrics,
                productivity: productivityMetrics,
                costs: costAnalysis,
                forecasts,
                executiveSummary: this.generateExecutiveSummary(
                    financialMetrics,
                    customerMetrics,
                    productivityMetrics
                ),
                kpis: this.getExecutiveKPIs(financialMetrics, customerMetrics, productivityMetrics)
            };

        } catch (error) {
            console.error('Error generando dashboard ejecutivo:', error);
            throw error;
        }
    }

    /**
     * Métodos utilitarios
     */
    async initializeWorkers() {
        // Implementar inicialización de workers para procesamiento pesado
        this.workers.metrics = { /* Worker para análisis de métricas */ };
        this.workers.predictive = { /* Worker para análisis predictivo */ };
    }

    async initializeCaches() {
        // Precargar métricas básicas en cache
        await this.primeCaches();
    }

    setupProcessing() {
        // Configurar actualizaciones periódicas
        setInterval(() => {
            this.updateRealTimeCache();
        }, this.config.dashboards.realTime.refreshInterval);

        setInterval(() => {
            this.cleanupCache();
        }, 60000); // 1 minuto
    }

    async updateRealTimeCache() {
        try {
            const metrics = await this.generateRealTimeMetrics();
            this.cache.realTime.set('current', {
                data: metrics,
                timestamp: Date.now()
            });

            // Emitir evento de actualización
            this.emit('metrics:updated', metrics);

        } catch (error) {
            console.error('Error actualizando cache:', error);
        }
    }

    cleanupCache() {
        const now = Date.now();
        const maxAge = 60000; // 1 minuto

        ['realTime', 'operational', 'executive'].forEach(cacheType => {
            for (const [key, value] of this.cache[cacheType]) {
                if (now - value.timestamp > maxAge) {
                    this.cache[cacheType].delete(key);
                }
            }
        });
    }

    calculateAbandonmentRate(callMetrics) {
        const { total_calls, answered_calls } = callMetrics;
        if (total_calls === 0) {return 0;}
        return ((total_calls - answered_calls) / total_calls);
    }

    calculatePerformanceMetrics(callMetrics, agentStatus) {
        if (!callMetrics || !agentStatus) {return null;}

        const { total_calls, answered_calls, avg_duration } = callMetrics;
        const totalAgents = agentStatus.total || 1;

        return {
            serviceLevel: this.calculateServiceLevel(total_calls, totalAgents),
            answerRate: total_calls > 0 ? (answered_calls / total_calls) : 0,
            averageHandlingTime: avg_duration || 0,
            utilization: (total_calls * (avg_duration || 180)) / (totalAgents * 7200), // 6 horas = 21600 segundos
            efficiency: (answered_calls / total_calls) * (total_calls > 0 ? 1 : 0)
        };
    }

    evaluateKPIs(callMetrics, agentStatus) {
        const thresholds = this.config.metrics.kpiThresholds;
        const alerts = [];

        // Service Level
        const serviceLevel = this.calculateServiceLevel(callMetrics.total_calls, agentStatus.total);
        if (serviceLevel < thresholds.serviceLevel.critical) {
            alerts.push({ type: 'service_level', level: 'critical', current: serviceLevel, target: thresholds.serviceLevel.target });
        } else if (serviceLevel < thresholds.serviceLevel.warning) {
            alerts.push({ type: 'service_level', level: 'warning', current: serviceLevel, target: thresholds.serviceLevel.target });
        }

        // Answer Rate
        const answerRate = callMetrics.total_calls > 0 ? (callMetrics.answered_calls / callMetrics.total_calls) : 0;
        if (answerRate < thresholds.answerRate.critical) {
            alerts.push({ type: 'answer_rate', level: 'critical', current: answerRate, target: thresholds.answerRate.target });
        }

        return alerts;
    }

    getDateRange(timeRange) {
        const now = new Date();
        const endDate = now;

        let startDate;
        switch (timeRange) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            default:
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        return { startDate, endDate };
    }

    generateExecutiveSummary(financial, customer, productivity) {
        return {
            highlights: [
                `Ingresos generados: ${financial.totalRevenue?.toLocaleString() || 'N/A'}`,
                `Satisfacción del cliente: ${customer.avgScore?.toFixed(1) || 'N/A'}/5`,
                `Productividad: ${productivity.efficiency?.toFixed(1) || 'N/A'}%`
            ],
            recommendations: [
                financial.revenue < financial.target ? 'Considerar estrategias de upselling' : null,
                customer.avgScore < 4.0 ? 'Enfocar en entrenamiento de empatía' : null,
                productivity.efficiency < 0.7 ? 'Revisar scripts y herramientas' : null
            ].filter(r => r !== null)
        };
    }

    // Implementar métodos específicos de métricas...
    async getPerformanceMetrics(startDate, endDate, filters) {
        // Implementar lógica para obtener métricas de rendimiento
        return { /* métricas de rendimiento */ };
    }

    async getAgentMetrics(startDate, endDate, filters) {
        // Implementar lógica para métricas por agente
        return { /* métricas por agente */ };
    }

    async getCampaignMetrics(startDate, endDate, filters) {
        // Implementar lógica para métricas por campaña
        return { /* métricas por campaña */ };
    }

    async getTrends(timeRange) {
        // Implementar lógica para análisis de tendencias
        return { /* datos de tendencias */ };
    }

    async getCurrentAlerts() {
        // Implementar lógica para obtener alertas actuales
        return { /* alertas activas */ };
    }

    // Más métodos para obtener datos específicos...
    async getHistoricalData(timeRange) {
        // Implementar obtención de datos históricos
        return { /* datos históricos */ };
    }

    async getComplianceMetrics() {
        // Implementar lógica para métricas de compliance
        return { /* métricas de compliance */ };
    }

    async getFinancialMetrics(startDate, endDate, filters) {
        // Implementar lógica para métricas financieras
        return { /* métricas financieras */ };
    }

    async getCustomerSatisfactionMetrics(startDate, endDate, filters) {
        // Implementar lógica para satisfacción del cliente
        return { /* métricas de satisfacción */ };
    }

    async getProductivityMetrics(startDate, endDate, filters) {
        // Implementar lógica para productividad
        return { /* métricas de productividad */ };
    }

    async getCostAnalysis(startDate, endDate, filters) {
        // Implementar lógica para análisis de costos
        return { /* análisis de costos */ };
    }

    async getForecasts() {
        // Implementar lógica para forecasting
        return { /* pronósticos */ };
    }

    calculateKPIs(financial, customer, productivity) {
        // Implementar cálculo de KPIs ejecutivos
        return { /* KPIs ejecutivos */ };
    }

    getExecutiveKPIs(financial, customer, productivity) {
        // Implementar KPIs ejecutivos
        return { /* KPIs ejecutivos */ };
    }

    calculateServiceLevel(totalCalls, totalAgents) {
        if (totalCalls === 0 || totalAgents === 0) {return 0;}
        const offeredCalls = totalCalls / totalAgents;
        // Simplificación: Service Level = (Answered / Offered) * 100
        // Aquí necesitaría mayor complejidad con datos reales
        return Math.min(0.95, (Math.random() * 0.2) + 0.75); // Simulado
    }

    async primeCaches() {
        // Precargar datos comunes en cache para mejorar rendimiento
        console.log('📊 Precargando caches de analytics...');
    }

    /**
     * Obtener vista general en tiempo real
     */
    async getRealtimeOverview() {
        try { // Error handling wrapper - try...catch block
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            // Métricas en tiempo real de agentes
            const [agentMetrics] = await db.sequelize.query(`
                SELECT
                    COUNT(DISTINCT a.id) as total_agents,
                    COUNT(DISTINCT CASE WHEN a.estado = 'online' THEN a.id END) as active_agents,
                    COUNT(DISTINCT CASE WHEN a.estado = 'break' THEN a.id END) as on_break_agents,
                    COUNT(DISTINCT CASE WHEN a.estado = 'offline' THEN a.id END) as offline_agents
                FROM usuarios a
                WHERE a.rol = 'AGENTE'
            `);

            // Métricas de llamadas del día
            const [callMetrics] = await db.sequelize.query(`
                SELECT
                    COUNT(*) as total_calls,
                    COUNT(DISTINCT CASE WHEN bc.disposicionId IS NOT NULL THEN bc.id END) as completed_calls,
                    COUNT(DISTINCT CASE WHEN bc.disposicionId IS NULL THEN bc.id END) as pending_calls,
                    COUNT(DISTINCT CASE WHEN bc.callbackDate IS NOT NULL THEN bc.id END) as scheduled_callbacks,
                    AVG(CASE WHEN bc.disposicionId IS NOT NULL THEN
                        EXTRACT(EPOCH FROM (bc.updatedAt - bc.createdAt))/60 END) as avg_handle_time
                FROM base_campanas bc
                WHERE DATE(bc.createdAt) = CURRENT_DATE
            `);

            // Métricas de campañas activas
            const [campaignMetrics] = await db.sequelize.query(`
                SELECT
                    COUNT(DISTINCT c.id) as total_campaigns,
                    COUNT(DISTINCT CASE WHEN c.activa = true THEN c.id END) as active_campaigns,
                    COUNT(DISTINCT bc.id) as total_records,
                    COUNT(DISTINCT CASE WHEN bc.disposicionId IS NULL THEN bc.id END) as pending_records
                FROM campanas c
                LEFT JOIN base_campanas bc ON c.id = bc.campanaId
            `);

            // Métricas de calidad del día
            const [qualityMetrics] = await db.sequelize.query(`
                SELECT
                    COUNT(qa.id) as total_evaluations,
                    AVG(qa.score) as avg_quality_score,
                    COUNT(CASE WHEN qa.score >= 70 THEN 1 END) as passed_evaluations,
                    COUNT(CASE WHEN qa.score >= 90 THEN 1 END) as excellent_evaluations
                FROM quality_analysis qa
                WHERE DATE(qa.created_at) = CURRENT_DATE
            `);

            // Calcular KPIs en tiempo real
            const totalAgents = agentMetrics[0]?.total_agents || 1;
            const activeAgents = agentMetrics[0]?.active_agents || 0;
            const totalCalls = callMetrics[0]?.total_calls || 0;
            const completedCalls = callMetrics[0]?.completed_calls || 0;
            const avgQualityScore = qualityMetrics[0]?.avg_quality_score || 0;

            const serviceLevel = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;
            const agentUtilization = totalAgents > 0 ? (activeAgents / totalAgents) * 100 : 0;
            const passRate = qualityMetrics[0]?.total_evaluations > 0
                ? (qualityMetrics[0].passed_evaluations / qualityMetrics[0].total_evaluations) * 100
                : 0;

            return {
                timestamp: now,
                agents: {
                    total: totalAgents,
                    active: activeAgents,
                    onBreak: agentMetrics[0]?.on_break_agents || 0,
                    offline: agentMetrics[0]?.offline_agents || 0,
                    utilization: Math.round(agentUtilization)
                },
                calls: {
                    total: totalCalls,
                    completed: completedCalls,
                    pending: callMetrics[0]?.pending_calls || 0,
                    scheduledCallbacks: callMetrics[0]?.scheduled_callbacks || 0,
                    avgHandleTime: Math.round(callMetrics[0]?.avg_handle_time || 0)
                },
                campaigns: {
                    total: campaignMetrics[0]?.total_campaigns || 0,
                    active: campaignMetrics[0]?.active_campaigns || 0,
                    totalRecords: campaignMetrics[0]?.total_records || 0,
                    pendingRecords: campaignMetrics[0]?.pending_records || 0
                },
                quality: {
                    totalEvaluations: qualityMetrics[0]?.total_evaluations || 0,
                    avgScore: Math.round(avgQualityScore),
                    passRate: Math.round(passRate),
                    excellentEvaluations: qualityMetrics[0]?.excellent_evaluations || 0
                },
                kpis: {
                    serviceLevel: Math.round(serviceLevel),
                    agentUtilization: Math.round(agentUtilization),
                    qualityPassRate: Math.round(passRate),
                    avgHandleTime: Math.round(callMetrics[0]?.avg_handle_time || 0)
                },
                alerts: await this.getCurrentAlerts()
            };

        } catch (error) {
            console.error('Error obteniendo vista general en tiempo real:', error);
            throw new Error(`No se pudo obtener la vista general en tiempo real: ${error.message}`);
        }
    }

    /**
     * Obtener vista general ejecutiva
     */
    async getExecutiveOverview(timeRange = 'month') {
        try { // Error handling wrapper - try...catch block
            const now = new Date();
            let startDate;

            // Definir rango de tiempo
            switch (timeRange) {
                case 'week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'quarter':
                    startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                    break;
                case 'year':
                    startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                    break;
                default: // month
                    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            }

            // Métricas financieras
            const financial = await this.getFinancialMetrics(startDate, now, {});

            // Métricas de satisfacción del cliente
            const customer = await this.getCustomerSatisfactionMetrics(startDate, now, {});

            // Métricas de productividad
            const productivity = await this.getProductivityMetrics(startDate, now, {});

            // Análisis de costos
            const costAnalysis = await this.getCostAnalysis(startDate, now, {});

            // Métricas de compliance
            const compliance = await this.getComplianceMetrics();

            // Pronósticos
            const forecasts = await this.getForecasts();

            // KPIs ejecutivos
            const kpis = this.calculateKPIs(financial, customer, productivity);
            const executiveKPIs = this.getExecutiveKPIs(financial, customer, productivity);

            // Tendencias del período
            const trends = await this.getTrends(timeRange);

            // Comparación con períodos anteriores
            const previousPeriod = await this.getPreviousPeriodComparison(startDate, timeRange);

            return {
                timeRange,
                period: {
                    start: startDate,
                    end: now,
                    days: Math.ceil((now - startDate) / (1000 * 60 * 60 * 24))
                },
                financial,
                customer,
                productivity,
                costAnalysis,
                compliance,
                forecasts,
                kpis: {
                    ...kpis,
                    executive: executiveKPIs
                },
                trends,
                comparison: previousPeriod,
                insights: await this.generateExecutiveInsights({
                    financial,
                    customer,
                    productivity,
                    kpis
                }),
                recommendations: await this.generateExecutiveRecommendations({
                    financial,
                    customer,
                    productivity,
                    compliance,
                    kpis
                }),
                lastUpdated: now
            };

        } catch (error) {
            console.error('Error obteniendo vista general ejecutiva:', error);
            throw new Error(`No se pudo obtener la vista general ejecutiva: ${error.message}`);
        }
    }

    /**
     * Obtener comparación con período anterior
     */
    async getPreviousPeriodComparison(currentStartDate, timeRange) {
        try {
            let periodLength;
            switch (timeRange) {
                case 'week':
                    periodLength = 7;
                    break;
                case 'quarter':
                    periodLength = 90;
                    break;
                case 'year':
                    periodLength = 365;
                    break;
                default:
                    periodLength = 30;
            }

            const previousEnd = currentStartDate;
            const previousStart = new Date(previousEnd.getTime() - periodLength * 24 * 60 * 60 * 1000);

            // Obtener métricas del período anterior
            const [previousMetrics] = await db.sequelize.query(`
                SELECT
                    COUNT(DISTINCT bc.id) as total_calls,
                    COUNT(DISTINCT CASE WHEN bc.disposicionId IN
                        (SELECT id FROM disposiciones WHERE tipo = 'EXITOSA')
                        THEN bc.id END) as successful_calls,
                    AVG(qa.score) as avg_quality_score,
                    COUNT(DISTINCT a.id) as active_agents
                FROM base_campanas bc
                LEFT JOIN quality_analysis qa ON bc.id = qa.call_id
                LEFT JOIN usuarios a ON bc.agenteId = a.id
                WHERE bc.createdAt BETWEEN ? AND ?
            `, {
                replacements: [previousStart, previousEnd]
            });

            const currentMetrics = await this.getCurrentPeriodMetrics(currentStartDate, new Date());

            if (!previousMetrics || previousMetrics.length === 0) {
                return {
                    calls: { change: 0, trend: 'stable' },
                    successRate: { change: 0, trend: 'stable' },
                    quality: { change: 0, trend: 'stable' },
                    productivity: { change: 0, trend: 'stable' }
                };
            }

            const prev = previousMetrics[0];
            const curr = currentMetrics;

            // Calcular cambios porcentuales
            const callsChange = prev.total_calls > 0
                ? ((curr.total_calls - prev.total_calls) / prev.total_calls) * 100
                : 0;

            const prevSuccessRate = prev.total_calls > 0
                ? (prev.successful_calls / prev.total_calls) * 100
                : 0;
            const currSuccessRate = curr.total_calls > 0
                ? (curr.successful_calls / curr.total_calls) * 100
                : 0;
            const successRateChange = prevSuccessRate > 0
                ? ((currSuccessRate - prevSuccessRate) / prevSuccessRate) * 100
                : 0;

            const qualityChange = prev.avg_quality_score > 0
                ? ((curr.avg_quality_score - prev.avg_quality_score) / prev.avg_quality_score) * 100
                : 0;

            const productivityChange = prev.active_agents > 0
                ? ((curr.active_agents - prev.active_agents) / prev.active_agents) * 100
                : 0;

            return {
                calls: {
                    current: curr.total_calls,
                    previous: prev.total_calls,
                    change: Math.round(callsChange),
                    trend: callsChange > 5 ? 'increasing' : callsChange < -5 ? 'decreasing' : 'stable'
                },
                successRate: {
                    current: Math.round(currSuccessRate),
                    previous: Math.round(prevSuccessRate),
                    change: Math.round(successRateChange),
                    trend: successRateChange > 5 ? 'increasing' : successRateChange < -5 ? 'decreasing' : 'stable'
                },
                quality: {
                    current: Math.round(curr.avg_quality_score),
                    previous: Math.round(prev.avg_quality_score),
                    change: Math.round(qualityChange),
                    trend: qualityChange > 5 ? 'improving' : qualityChange < -5 ? 'declining' : 'stable'
                },
                productivity: {
                    current: curr.active_agents,
                    previous: prev.active_agents,
                    change: Math.round(productivityChange),
                    trend: productivityChange > 5 ? 'increasing' : productivityChange < -5 ? 'decreasing' : 'stable'
                }
            };

        } catch (error) {
            console.error('Error obteniendo comparación con período anterior:', error);
            return {
                calls: { change: 0, trend: 'stable' },
                successRate: { change: 0, trend: 'stable' },
                quality: { change: 0, trend: 'stable' },
                productivity: { change: 0, trend: 'stable' }
            };
        }
    }

    /**
     * Obtener métricas del período actual
     */
    async getCurrentPeriodMetrics(startDate, endDate) {
        try {
            const [metrics] = await db.sequelize.query(`
                SELECT
                    COUNT(DISTINCT bc.id) as total_calls,
                    COUNT(DISTINCT CASE WHEN bc.disposicionId IN
                        (SELECT id FROM disposiciones WHERE tipo = 'EXITOSA')
                        THEN bc.id END) as successful_calls,
                    COALESCE(AVG(qa.score), 0) as avg_quality_score,
                    COUNT(DISTINCT a.id) as active_agents
                FROM base_campanas bc
                LEFT JOIN quality_analysis qa ON bc.id = qa.call_id
                LEFT JOIN usuarios a ON bc.agenteId = a.id AND a.estado = 'online'
                WHERE bc.createdAt BETWEEN ? AND ?
            `, {
                replacements: [startDate, endDate]
            });

            return metrics[0] || {
                total_calls: 0,
                successful_calls: 0,
                avg_quality_score: 0,
                active_agents: 0
            };

        } catch (error) {
            console.error('Error obteniendo métricas del período actual:', error);
            return {
                total_calls: 0,
                successful_calls: 0,
                avg_quality_score: 0,
                active_agents: 0
            };
        }
    }

    /**
     * Generar insights ejecutivos
     */
    async generateExecutiveInsights(metrics) {
        const insights = [];
        const { financial, customer, productivity, kpis } = metrics;

        // Insights financieros
        if (financial.roi && financial.roi < 0) {
            insights.push({
                type: 'financial',
                priority: 'high',
                title: 'ROI Negativo Detectado',
                description: 'El retorno de inversión es negativo en el período actual',
                impact: 'high',
                recommendation: 'Revisar estructura de costos y estrategias de ventas'
            });
        }

        if (financial.revenueGrowth && financial.revenueGrowth < 0) {
            insights.push({
                type: 'financial',
                priority: 'critical',
                title: 'Crecimiento Negativo',
                description: 'Los ingresos han disminuido respecto al período anterior',
                impact: 'critical',
                recommendation: 'Implementar acciones correctivas inmediatas'
            });
        }

        // Insights de satisfacción del cliente
        if (customer.csat && customer.csat < 70) {
            insights.push({
                type: 'customer',
                priority: 'high',
                title: 'Satisfacción del Cliente Baja',
                description: 'El CSAT está por debajo del umbral aceptable',
                impact: 'high',
                recommendation: 'Implementar programa de mejora de experiencia del cliente'
            });
        }

        // Insights de productividad
        if (productivity.agentUtilization && productivity.agentUtilization < 70) {
            insights.push({
                type: 'productivity',
                priority: 'medium',
                title: 'Subutilización de Agentes',
                description: 'La utilización de agentes es inferior al 70%',
                impact: 'medium',
                recommendation: 'Optimizar asignación de recursos y revisar turnos'
            });
        }

        // Insights de KPIs
        if (kpis.serviceLevel && kpis.serviceLevel < 75) {
            insights.push({
                type: 'operational',
                priority: 'high',
                title: 'Nivel de Servicio Crítico',
                description: 'El nivel de servicio está por debajo del objetivo',
                impact: 'high',
                recommendation: 'Aumentar personal o mejorar eficiencia operativa'
            });
        }

        return insights.sort((a, b) => {
            const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        });
    }

    /**
     * Generar recomendaciones ejecutivas
     */
    async generateExecutiveRecommendations(metrics) {
        const recommendations = [];
        const { financial, customer, productivity, compliance, kpis } = metrics;

        // Recomendaciones financieras
        if (financial.costPerCall > financial.revenuePerCall) {
            recommendations.push({
                category: 'financial',
                priority: 'critical',
                title: 'Optimizar Costo por Llamada',
                description: 'El costo por llamada excede los ingresos generados',
                actions: [
                    'Revisar eficiencia operativa',
                    'Optimizar tecnología y herramientas',
                    'Renegociar contratos con proveedores'
                ],
                expectedImpact: 'high',
                timeframe: '1-3 months'
            });
        }

        // Recomendaciones de cliente
        if (customer.churnRate > 10) {
            recommendations.push({
                category: 'customer',
                priority: 'high',
                title: 'Reducir Tasa de Abandono',
                description: 'La tasa de abandono es superior al 10%',
                actions: [
                    'Implementar programa de retención',
                    'Mejorar servicio al cliente',
                    'Analizar causas de abandono'
                ],
                expectedImpact: 'high',
                timeframe: '2-4 months'
            });
        }

        // Recomendaciones de productividad
        if (productivity.callHandlingTime > 300) { // 5 minutos
            recommendations.push({
                category: 'productivity',
                priority: 'medium',
                title: 'Optimizar Tiempo de Gestión de Llamadas',
                description: 'El tiempo promedio de gestión excede los 5 minutos',
                actions: [
                    'Capacitar en técnicas de eficiencia',
                    'Mejorar guiones y flujos',
                    'Implementar herramientas de automatización'
                ],
                expectedImpact: 'medium',
                timeframe: '1-2 months'
            });
        }

        // Recomendaciones de compliance
        if (compliance.complianceRate < 95) {
            recommendations.push({
                category: 'compliance',
                priority: 'high',
                title: 'Mejorar Tasa de Cumplimiento',
                description: 'La tasa de cumplimiento es inferior al 95%',
                actions: [
                    'Refrescar entrenamiento normativo',
                    'Implementar sistemas de monitoreo',
                    'Establecer controles automáticos'
                ],
                expectedImpact: 'high',
                timeframe: '1 month'
            });
        }

        return recommendations;
    }
}

export default new AdvancedAnalyticsService();