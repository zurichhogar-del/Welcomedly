import db from '../models/index.js';
import { Op } from 'sequelize';

const { AgentMetric, CampaignMetric, User, Campana, BaseCampana, Call, WorkSession, AgentStatus } = db;

class AnalyticsService {
    /**
     * Genera métricas de agente para un período específico
     * @param {number} agenteId - ID del agente
     * @param {Date} startDate - Fecha de inicio
     * @param {Date} endDate - Fecha de fin
     * @returns {Object} Métricas del agente
     */
    async getAgentMetrics(agenteId, startDate, endDate) {
        try {
            // Obtener llamadas del agente en el período
            const calls = await Call.findAll({
                where: {
                    agentId: agenteId,
                    startTime: {
                        [Op.between]: [startDate, endDate],
                    },
                },
            });

            // Obtener sesiones de trabajo
            const workSessions = await WorkSession.findAll({
                where: {
                    agenteId: agenteId,
                    loginTime: {
                        [Op.between]: [startDate, endDate],
                    },
                },
            });

            // Calcular métricas
            const totalCalls = calls.length;
            const answeredCalls = calls.filter((c) => c.disposition === 'ANSWERED').length;
            const totalTalkTime = calls.reduce((sum, c) => sum + (c.duration || 0), 0);
            const avgCallDuration = totalCalls > 0 ? Math.round(totalTalkTime / totalCalls) : 0;

            // Calcular tiempo productivo y en pausa
            let totalProductiveTime = 0;
            let totalPauseTime = 0;

            for (const session of workSessions) {
                if (session.logoutTime) {
                    const sessionDuration = Math.floor(
                        (new Date(session.logoutTime) - new Date(session.loginTime)) / 1000
                    );
                    totalProductiveTime += sessionDuration;
                }

                if (session.totalPauseTime) {
                    totalPauseTime += session.totalPauseTime;
                }
            }

            // Obtener ventas (disposiciones EXITOSA)
            const salesCount = await BaseCampana.count({
                where: {
                    agenteId: agenteId,
                    disposicionId: {
                        [Op.ne]: null,
                    },
                },
                include: [
                    {
                        model: db.Disposicion,
                        as: 'disposicion',
                        where: {
                            tipo: 'EXITOSA',
                        },
                    },
                ],
            });

            // Obtener estado actual del agente
            const currentStatus = await AgentStatus.findOne({
                where: { agenteId: agenteId },
                order: [['updatedAt', 'DESC']],
            });

            return {
                agenteId,
                period: {
                    start: startDate,
                    end: endDate,
                },
                status: currentStatus?.status || 'OFFLINE',
                calls: {
                    total: totalCalls,
                    answered: answeredCalls,
                    answerRate: totalCalls > 0 ? ((answeredCalls / totalCalls) * 100).toFixed(2) : 0,
                },
                time: {
                    productive: totalProductiveTime,
                    pause: totalPauseTime,
                    talk: totalTalkTime,
                    avgCallDuration: avgCallDuration,
                },
                sales: {
                    count: salesCount,
                    conversionRate:
                        answeredCalls > 0 ? ((salesCount / answeredCalls) * 100).toFixed(2) : 0,
                },
            };
        } catch (error) {
            console.error('[AnalyticsService] Error getting agent metrics:', error);
            throw error;
        }
    }

    /**
     * Genera métricas de campaña para un período específico
     * @param {number} campanaId - ID de la campaña
     * @param {Date} startDate - Fecha de inicio
     * @param {Date} endDate - Fecha de fin
     * @returns {Object} Métricas de la campaña
     */
    async getCampaignMetrics(campanaId, startDate, endDate) {
        try {
            // Total de leads en la campaña
            const totalLeads = await BaseCampana.count({
                where: { campanaId },
            });

            // Leads contactados (con disposición)
            const contactedLeads = await BaseCampana.count({
                where: {
                    campanaId,
                    disposicionId: {
                        [Op.ne]: null,
                    },
                    updatedAt: {
                        [Op.between]: [startDate, endDate],
                    },
                },
            });

            // Llamadas exitosas y fallidas
            const successfulCalls = await BaseCampana.count({
                where: {
                    campanaId,
                    updatedAt: {
                        [Op.between]: [startDate, endDate],
                    },
                },
                include: [
                    {
                        model: db.Disposicion,
                        as: 'disposicion',
                        where: {
                            tipo: 'EXITOSA',
                        },
                    },
                ],
            });

            const failedCalls = await BaseCampana.count({
                where: {
                    campanaId,
                    updatedAt: {
                        [Op.between]: [startDate, endDate],
                    },
                },
                include: [
                    {
                        model: db.Disposicion,
                        as: 'disposicion',
                        where: {
                            tipo: 'NO_EXITOSA',
                        },
                    },
                ],
            });

            // Agentes activos en la campaña
            const activeAgents = await BaseCampana.count({
                where: {
                    campanaId,
                    agenteId: {
                        [Op.ne]: null,
                    },
                    updatedAt: {
                        [Op.between]: [startDate, endDate],
                    },
                },
                distinct: true,
                col: 'agenteId',
            });

            // Obtener llamadas relacionadas con la campaña
            const campaignCalls = await Call.findAll({
                where: {
                    startTime: {
                        [Op.between]: [startDate, endDate],
                    },
                },
                include: [
                    {
                        model: User,
                        as: 'agent',
                        required: true,
                        include: [
                            {
                                model: BaseCampana,
                                as: 'leads',
                                where: { campanaId },
                                required: true,
                            },
                        ],
                    },
                ],
            });

            const totalCallTime = campaignCalls.reduce((sum, c) => sum + (c.duration || 0), 0);
            const avgCallDuration =
                campaignCalls.length > 0 ? Math.round(totalCallTime / campaignCalls.length) : 0;

            // Calcular tasa de conversión
            const conversionRate =
                contactedLeads > 0 ? ((successfulCalls / contactedLeads) * 100).toFixed(2) : 0;

            return {
                campanaId,
                period: {
                    start: startDate,
                    end: endDate,
                },
                leads: {
                    total: totalLeads,
                    contacted: contactedLeads,
                    contactRate: totalLeads > 0 ? ((contactedLeads / totalLeads) * 100).toFixed(2) : 0,
                },
                calls: {
                    successful: successfulCalls,
                    failed: failedCalls,
                    total: successfulCalls + failedCalls,
                },
                conversion: {
                    rate: conversionRate,
                    count: successfulCalls,
                },
                time: {
                    total: totalCallTime,
                    average: avgCallDuration,
                },
                agents: {
                    active: activeAgents,
                },
            };
        } catch (error) {
            console.error('[AnalyticsService] Error getting campaign metrics:', error);
            throw error;
        }
    }

    /**
     * Obtiene métricas comparativas de todos los agentes
     * @param {Date} startDate - Fecha de inicio
     * @param {Date} endDate - Fecha de fin
     * @returns {Array} Array de métricas de agentes
     */
    async compareAgents(startDate, endDate) {
        try {
            const agents = await User.findAll({
                where: {
                    rol: 'AGENTE',
                    activo: true,
                },
            });

            const agentMetrics = [];

            for (const agent of agents) {
                const metrics = await this.getAgentMetrics(agent.id, startDate, endDate);
                agentMetrics.push({
                    agentId: agent.id,
                    agentName: agent.nombre,
                    agentEmail: agent.correo,
                    ...metrics,
                });
            }

            // Ordenar por total de llamadas (descendente)
            agentMetrics.sort((a, b) => b.calls.total - a.calls.total);

            return agentMetrics;
        } catch (error) {
            console.error('[AnalyticsService] Error comparing agents:', error);
            throw error;
        }
    }

    /**
     * Obtiene métricas por hora para un agente específico
     * @param {number} agenteId - ID del agente
     * @param {Date} date - Fecha específica
     * @returns {Array} Métricas por hora
     */
    async getAgentHourlyMetrics(agenteId, date) {
        try {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            const calls = await Call.findAll({
                where: {
                    agentId: agenteId,
                    startTime: {
                        [Op.between]: [startOfDay, endOfDay],
                    },
                },
                order: [['startTime', 'ASC']],
            });

            // Agrupar por hora
            const hourlyData = Array.from({ length: 24 }, (_, i) => ({
                hour: i,
                calls: 0,
                answered: 0,
                duration: 0,
            }));

            calls.forEach((call) => {
                const hour = new Date(call.startTime).getHours();
                hourlyData[hour].calls++;
                if (call.disposition === 'ANSWERED') {
                    hourlyData[hour].answered++;
                }
                hourlyData[hour].duration += call.duration || 0;
            });

            // Calcular promedio de duración por hora
            hourlyData.forEach((data) => {
                data.avgDuration = data.calls > 0 ? Math.round(data.duration / data.calls) : 0;
            });

            return hourlyData;
        } catch (error) {
            console.error('[AnalyticsService] Error getting hourly metrics:', error);
            throw error;
        }
    }

    /**
     * Guarda snapshot de métricas de agente
     * @param {number} agenteId - ID del agente
     */
    async saveAgentMetricSnapshot(agenteId) {
        try {
            const now = new Date();
            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);

            const metrics = await this.getAgentMetrics(agenteId, startOfDay, now);

            await AgentMetric.create({
                agenteId: agenteId,
                timestamp: now,
                status: metrics.status,
                productiveTime: metrics.time.productive,
                pauseTime: metrics.time.pause,
                callsHandled: metrics.calls.total,
                salesCount: metrics.sales.count,
                avgCallDuration: metrics.time.avgCallDuration,
                totalTalkTime: metrics.time.talk,
            });

            console.log(`[AnalyticsService] Saved metric snapshot for agent ${agenteId}`);
        } catch (error) {
            console.error('[AnalyticsService] Error saving agent metric snapshot:', error);
            throw error;
        }
    }

    /**
     * Guarda snapshot de métricas de campaña
     * @param {number} campanaId - ID de la campaña
     */
    async saveCampaignMetricSnapshot(campanaId) {
        try {
            const now = new Date();
            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);

            const metrics = await this.getCampaignMetrics(campanaId, startOfDay, now);

            await CampaignMetric.create({
                campanaId: campanaId,
                timestamp: now,
                totalLeads: metrics.leads.total,
                contactedLeads: metrics.leads.contacted,
                successfulCalls: metrics.calls.successful,
                failedCalls: metrics.calls.failed,
                conversionRate: metrics.conversion.rate,
                avgCallDuration: metrics.time.average,
                totalCallTime: metrics.time.total,
                activeAgents: metrics.agents.active,
            });

            console.log(`[AnalyticsService] Saved metric snapshot for campaign ${campanaId}`);
        } catch (error) {
            console.error('[AnalyticsService] Error saving campaign metric snapshot:', error);
            throw error;
        }
    }

    /**
     * Obtiene tendencia histórica de métricas de agente
     * @param {number} agenteId - ID del agente
     * @param {Date} startDate - Fecha de inicio
     * @param {Date} endDate - Fecha de fin
     * @returns {Array} Datos históricos
     */
    async getAgentTrend(agenteId, startDate, endDate) {
        try {
            const metrics = await AgentMetric.findAll({
                where: {
                    agenteId: agenteId,
                    timestamp: {
                        [Op.between]: [startDate, endDate],
                    },
                },
                order: [['timestamp', 'ASC']],
            });

            return metrics.map((m) => ({
                timestamp: m.timestamp,
                calls: m.callsHandled,
                sales: m.salesCount,
                avgDuration: m.avgCallDuration,
                productiveTime: m.productiveTime,
                pauseTime: m.pauseTime,
            }));
        } catch (error) {
            console.error('[AnalyticsService] Error getting agent trend:', error);
            throw error;
        }
    }

    /**
     * Obtiene tendencia histórica de métricas de campaña
     * @param {number} campanaId - ID de la campaña
     * @param {Date} startDate - Fecha de inicio
     * @param {Date} endDate - Fecha de fin
     * @returns {Array} Datos históricos
     */
    async getCampaignTrend(campanaId, startDate, endDate) {
        try {
            const metrics = await CampaignMetric.findAll({
                where: {
                    campanaId: campanaId,
                    timestamp: {
                        [Op.between]: [startDate, endDate],
                    },
                },
                order: [['timestamp', 'ASC']],
            });

            return metrics.map((m) => ({
                timestamp: m.timestamp,
                totalLeads: m.totalLeads,
                contacted: m.contactedLeads,
                successful: m.successfulCalls,
                failed: m.failedCalls,
                conversionRate: m.conversionRate,
                avgDuration: m.avgCallDuration,
            }));
        } catch (error) {
            console.error('[AnalyticsService] Error getting campaign trend:', error);
            throw error;
        }
    }
}

export default new AnalyticsService();
