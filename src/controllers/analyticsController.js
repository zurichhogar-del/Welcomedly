import analyticsService from '../services/analyticsService.js';
import { Parser } from 'json2csv';

class AnalyticsController {
    /**
     * Renderiza el dashboard principal de analytics
     */
    async renderDashboard(req, res) {
        try {
            res.render('analyticsViews/dashboard', {
                layout: 'layouts/generalLayout',
                user: req.session.user,
                title: 'Dashboard de Analytics',
            });
        } catch (error) {
            console.error('[AnalyticsController] Error rendering dashboard:', error);
            req.session.swalError = 'Error al cargar el dashboard de analytics';
            res.redirect('/dashboard');
        }
    }

    /**
     * API: Obtiene métricas de un agente
     * GET /api/analytics/agent/:agentId
     */
    async getAgentMetrics(req, res) {
        try {
            const { agentId } = req.params;
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren startDate y endDate',
                });
            }

            const metrics = await analyticsService.getAgentMetrics(
                parseInt(agentId),
                new Date(startDate),
                new Date(endDate)
            );

            res.json({
                success: true,
                metrics,
            });
        } catch (error) {
            console.error('[AnalyticsController] Error getting agent metrics:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener métricas del agente',
                error: error.message,
            });
        }
    }

    /**
     * API: Obtiene métricas de una campaña
     * GET /api/analytics/campaign/:campaignId
     */
    async getCampaignMetrics(req, res) {
        try {
            const { campaignId } = req.params;
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren startDate y endDate',
                });
            }

            const metrics = await analyticsService.getCampaignMetrics(
                parseInt(campaignId),
                new Date(startDate),
                new Date(endDate)
            );

            res.json({
                success: true,
                metrics,
            });
        } catch (error) {
            console.error('[AnalyticsController] Error getting campaign metrics:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener métricas de la campaña',
                error: error.message,
            });
        }
    }

    /**
     * API: Compara métricas de todos los agentes
     * GET /api/analytics/agents/compare
     */
    async compareAgents(req, res) {
        try {
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren startDate y endDate',
                });
            }

            const comparison = await analyticsService.compareAgents(
                new Date(startDate),
                new Date(endDate)
            );

            res.json({
                success: true,
                comparison,
            });
        } catch (error) {
            console.error('[AnalyticsController] Error comparing agents:', error);
            res.status(500).json({
                success: false,
                message: 'Error al comparar agentes',
                error: error.message,
            });
        }
    }

    /**
     * API: Obtiene métricas por hora de un agente
     * GET /api/analytics/agent/:agentId/hourly
     */
    async getAgentHourlyMetrics(req, res) {
        try {
            const { agentId } = req.params;
            const { date } = req.query;

            if (!date) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere date',
                });
            }

            const hourlyMetrics = await analyticsService.getAgentHourlyMetrics(
                parseInt(agentId),
                new Date(date)
            );

            res.json({
                success: true,
                hourlyMetrics,
            });
        } catch (error) {
            console.error('[AnalyticsController] Error getting hourly metrics:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener métricas por hora',
                error: error.message,
            });
        }
    }

    /**
     * API: Obtiene tendencia histórica de un agente
     * GET /api/analytics/agent/:agentId/trend
     */
    async getAgentTrend(req, res) {
        try {
            const { agentId } = req.params;
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren startDate y endDate',
                });
            }

            const trend = await analyticsService.getAgentTrend(
                parseInt(agentId),
                new Date(startDate),
                new Date(endDate)
            );

            res.json({
                success: true,
                trend,
            });
        } catch (error) {
            console.error('[AnalyticsController] Error getting agent trend:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener tendencia del agente',
                error: error.message,
            });
        }
    }

    /**
     * API: Obtiene tendencia histórica de una campaña
     * GET /api/analytics/campaign/:campaignId/trend
     */
    async getCampaignTrend(req, res) {
        try {
            const { campaignId } = req.params;
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren startDate y endDate',
                });
            }

            const trend = await analyticsService.getCampaignTrend(
                parseInt(campaignId),
                new Date(startDate),
                new Date(endDate)
            );

            res.json({
                success: true,
                trend,
            });
        } catch (error) {
            console.error('[AnalyticsController] Error getting campaign trend:', error);
            res.status(500).json({
                success: false,
                message: 'Error al obtener tendencia de la campaña',
                error: error.message,
            });
        }
    }

    /**
     * Exporta métricas de agentes a CSV
     * GET /api/analytics/export/agents/csv
     */
    async exportAgentsToCSV(req, res) {
        try {
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren startDate y endDate',
                });
            }

            const comparison = await analyticsService.compareAgents(
                new Date(startDate),
                new Date(endDate)
            );

            // Transformar datos para CSV
            const csvData = comparison.map((agent) => ({
                Agente: agent.agentName,
                Email: agent.agentEmail,
                Estado: agent.status,
                'Total Llamadas': agent.calls.total,
                'Llamadas Contestadas': agent.calls.answered,
                'Tasa de Respuesta (%)': agent.calls.answerRate,
                'Tiempo Productivo (seg)': agent.time.productive,
                'Tiempo en Pausa (seg)': agent.time.pause,
                'Tiempo en Llamadas (seg)': agent.time.talk,
                'Duración Promedio (seg)': agent.time.avgCallDuration,
                Ventas: agent.sales.count,
                'Tasa de Conversión (%)': agent.sales.conversionRate,
            }));

            // Convertir a CSV
            const parser = new Parser();
            const csv = parser.parse(csvData);

            // Configurar headers de descarga
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="reporte-agentes-${new Date().toISOString().split('T')[0]}.csv"`
            );

            res.send(csv);
        } catch (error) {
            console.error('[AnalyticsController] Error exporting agents to CSV:', error);
            res.status(500).json({
                success: false,
                message: 'Error al exportar datos a CSV',
                error: error.message,
            });
        }
    }

    /**
     * Exporta métricas de campaña a CSV
     * GET /api/analytics/export/campaign/:campaignId/csv
     */
    async exportCampaignToCSV(req, res) {
        try {
            const { campaignId } = req.params;
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Se requieren startDate y endDate',
                });
            }

            const metrics = await analyticsService.getCampaignMetrics(
                parseInt(campaignId),
                new Date(startDate),
                new Date(endDate)
            );

            // Transformar datos para CSV
            const csvData = [
                {
                    'ID Campaña': metrics.campanaId,
                    'Período Inicio': metrics.period.start,
                    'Período Fin': metrics.period.end,
                    'Total Leads': metrics.leads.total,
                    'Leads Contactados': metrics.leads.contacted,
                    'Tasa de Contacto (%)': metrics.leads.contactRate,
                    'Llamadas Exitosas': metrics.calls.successful,
                    'Llamadas Fallidas': metrics.calls.failed,
                    'Total Llamadas': metrics.calls.total,
                    'Tasa de Conversión (%)': metrics.conversion.rate,
                    'Ventas': metrics.conversion.count,
                    'Tiempo Total Llamadas (seg)': metrics.time.total,
                    'Duración Promedio (seg)': metrics.time.average,
                    'Agentes Activos': metrics.agents.active,
                },
            ];

            // Convertir a CSV
            const parser = new Parser();
            const csv = parser.parse(csvData);

            // Configurar headers de descarga
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader(
                'Content-Disposition',
                `attachment; filename="reporte-campana-${campaignId}-${new Date().toISOString().split('T')[0]}.csv"`
            );

            res.send(csv);
        } catch (error) {
            console.error('[AnalyticsController] Error exporting campaign to CSV:', error);
            res.status(500).json({
                success: false,
                message: 'Error al exportar datos a CSV',
                error: error.message,
            });
        }
    }
}

export default new AnalyticsController();
