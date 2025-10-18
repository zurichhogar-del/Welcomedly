import db from '../models/index.js';
import { Op } from 'sequelize';
import reportingService from '../services/reportingService.js';
import webSocketService from '../services/websocketService.js';

const { User, AgentStatusLog, Campana } = db;

// Get operations dashboard
export async function getOperationsDashboard(req, res) {
    try {
        const now = new Date();
        
        // Get all agents with their current status
        const agents = await User.findAll({
            where: { rol: 'AGENTE' },
            attributes: ['id', 'primerNombre', 'primerApellido', 'username', 'status', 'lastStatusChange'],
            include: [{
                model: AgentStatusLog,
                as: 'statusLogs',
                limit: 1,
                order: [['timestamp', 'DESC']]
            }]
        });

        // Get status distribution
        const statusDistribution = await User.findAll({
            where: { rol: 'AGENTE' },
            attributes: [
                'status',
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
            ],
            group: ['status']
        });

        // Get active campaigns
        const activeCampaigns = await Campana.findAll({
            where: { 
                estado: 'ACTIVA',
                fechaInicio: { [Op.lte]: now },
                fechaFin: { [Op.gte]: now }
            },
            attributes: ['id', 'nombre', 'fechaInicio', 'fechaFin', 'estado']
        });

        // Get today's status changes
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayStatusLogs = await AgentStatusLog.findAll({
            where: {
                timestamp: { [Op.gte]: today }
            },
            include: [{
                model: User,
                as: 'agent',
                attributes: ['primerNombre', 'primerApellido']
            }],
            order: [['timestamp', 'DESC']],
            limit: 20
        });

        // Get productivity metrics using reporting service
        const productivityMetrics = await calculateProductivityMetrics();

        res.render('operations/dashboard', {
            layout: 'layouts/generalLayout',
            agents,
            statusDistribution,
            activeCampaigns,
            todayStatusLogs,
            productivityMetrics,
            pageTitle: 'Panel de Operaciones'
        });
    } catch (error) {
        console.error('Error loading operations dashboard:', error);
        req.session.alert = {
            type: 'error',
            message: 'Error al cargar el panel de operaciones'
        };
        res.redirect('/market/market');
    }
}

// Get agent monitoring data
export async function getAgentMonitoring(req, res) {
    try {
        const agents = await User.findAll({
            where: { rol: 'AGENTE' },
            attributes: ['id', 'primerNombre', 'primerApellido', 'username', 'status', 'lastStatusChange', 'correo'],
            include: [{
                model: AgentStatusLog,
                as: 'statusLogs',
                order: [['timestamp', 'DESC']],
                limit: 10
            }]
        });

        res.json({
            success: true,
            data: agents
        });
    } catch (error) {
        console.error('Error getting agent monitoring:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener datos de monitoreo de agentes'
        });
    }
}

// Update agent status (operations override)
export async function updateAgentStatus(req, res) {
    try {
        const { agentId, status, reason } = req.body;
        
        const agent = await User.findByPk(agentId);
        if (!agent) {
            return res.status(404).json({
                success: false,
                message: 'Agente no encontrado'
            });
        }

        // Calculate duration of previous status
        let duration = 0;
        if (agent.lastStatusChange) {
            duration = Math.floor((new Date() - agent.lastStatusChange) / 1000);
        }

        // Update agent status
        await User.update(
            { 
                status: status,
                lastStatusChange: new Date()
            },
            { where: { id: agentId } }
        );

        // Log status change
        await AgentStatusLog.create({
            userId: agentId,
            status: status,
            duration: duration,
            metadata: {
                changedBy: req.user.id,
                changedByRole: req.user.rol,
                reason: reason || 'Cambio por administrador de operaciones'
            }
        });

        // Broadcast status update via WebSocket
        webSocketService.broadcastToOperations('agent_status_updated', {
            agentId: agentId,
            status: status,
            timestamp: new Date(),
            duration: duration,
            reason: reason || 'Cambio por administrador de operaciones',
            changedBy: {
                id: req.user.id,
                name: `${req.user.primerNombre} ${req.user.primerApellido}`,
                role: req.user.rol
            }
        });

        // If agent is connected, send command to update their status
        if (webSocketService.isAgentConnected(agentId)) {
            webSocketService.sendToAgent(agentId, 'status_changed', {
                status: status,
                reason: reason || 'Estado cambiado por operaciones',
                changedBy: `${req.user.primerNombre} ${req.user.primerApellido}`
            });
        }

        res.json({
            success: true,
            message: 'Estado del agente actualizado correctamente'
        });
    } catch (error) {
        console.error('Error updating agent status:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar estado del agente'
        });
    }
}

// Get productivity reports
export async function getProductivityReport(req, res) {
    try {
        const { startDate, endDate, agentId } = req.query;
        
        const whereClause = {
            timestamp: {}
        };
        
        if (startDate) {
            whereClause.timestamp[Op.gte] = new Date(startDate);
        }
        if (endDate) {
            whereClause.timestamp[Op.lte] = new Date(endDate);
        }
        if (agentId) {
            whereClause.userId = agentId;
        }

        const statusLogs = await AgentStatusLog.findAll({
            where: whereClause,
            include: [{
                model: User,
                as: 'agent',
                attributes: ['primerNombre', 'primerApellido', 'username']
            }],
            order: [['timestamp', 'ASC']]
        });

        // Use reporting service to generate report
        const report = await reportingService.getProductivityMetrics(
            startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Default: last 7 days
            endDate ? new Date(endDate) : new Date(),
            agentId
        );

        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Error generating productivity report:', error);
        res.status(500).json({
            success: false,
            message: 'Error al generar reporte de productividad'
        });
    }
}

// Get real-time dashboard data
export async function getRealTimeDashboardData(req, res) {
    try {
        const dashboardData = await reportingService.getDashboardData();
        
        // Add WebSocket connection stats
        dashboardData.connectedAgents = webSocketService.getConnectedAgentsCount();
        dashboardData.connectedOperations = webSocketService.getConnectedOperationsCount();

        res.json({
            success: true,
            data: dashboardData
        });
    } catch (error) {
        console.error('Error getting real-time dashboard data:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener datos del dashboard'
        });
    }
}

// Get campaign performance data
export async function getCampaignPerformance(req, res) {
    try {
        const { campaignId } = req.query;
        const performanceData = await reportingService.getCampaignPerformance(campaignId);

        res.json({
            success: true,
            data: performanceData
        });
    } catch (error) {
        console.error('Error getting campaign performance:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener datos de campaña'
        });
    }
}

// Send command to agent
export async function sendCommandToAgent(req, res) {
    try {
        const { agentId, command, params } = req.body;

        const agent = await User.findByPk(agentId);
        if (!agent || agent.rol !== 'AGENTE') {
            return res.status(404).json({
                success: false,
                message: 'Agente no encontrado'
            });
        }

        // Send command via WebSocket
        const sent = webSocketService.sendToAgent(agentId, 'command', {
            command: command,
            params: params,
            fromUser: {
                id: req.user.id,
                name: `${req.user.primerNombre} ${req.user.primerApellido}`,
                role: req.user.rol
            },
            timestamp: new Date()
        });

        if (sent) {
            res.json({
                success: true,
                message: 'Comando enviado al agente'
            });
        } else {
            res.json({
                success: false,
                message: 'Agente no está conectado'
            });
        }
    } catch (error) {
        console.error('Error sending command to agent:', error);
        res.status(500).json({
            success: false,
            message: 'Error al enviar comando al agente'
        });
    }
}

// Helper functions
async function calculateProductivityMetrics() {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const agents = await User.findAll({
        where: { rol: 'AGENTE' }
    });

    let totalAvailableTime = 0;
    let totalOnCallTime = 0;
    let totalWrapUpTime = 0;
    let totalBreakTime = 0;

    for (const agent of agents) {
        const todayLogs = await AgentStatusLog.findAll({
            where: {
                userId: agent.id,
                timestamp: { [Op.gte]: startOfDay }
            }
        });

        todayLogs.forEach(log => {
            if (log.duration) {
                switch (log.status) {
                    case 'available':
                        totalAvailableTime += log.duration;
                        break;
                    case 'on_call':
                        totalOnCallTime += log.duration;
                        break;
                    case 'wrap_up':
                        totalWrapUpTime += log.duration;
                        break;
                    case 'break':
                        totalBreakTime += log.duration;
                        break;
                }
            }
        });
    }

    const totalWorkTime = totalAvailableTime + totalOnCallTime + totalWrapUpTime;
    const productivityPercentage = totalWorkTime > 0 
        ? ((totalOnCallTime / totalWorkTime) * 100).toFixed(2)
        : 0;

    return {
        totalAvailableTime: Math.floor(totalAvailableTime / 3600), // hours
        totalOnCallTime: Math.floor(totalOnCallTime / 3600), // hours
        totalWrapUpTime: Math.floor(totalWrapUpTime / 3600), // hours
        totalBreakTime: Math.floor(totalBreakTime / 3600), // hours
        productivityPercentage: parseFloat(productivityPercentage),
        totalAgents: agents.length
    };
}

function generateProductivityReport(statusLogs) {
    const agentMetrics = {};
    
    statusLogs.forEach(log => {
        if (!agentMetrics[log.userId]) {
            agentMetrics[log.userId] = {
                agentName: `${log.agent.primerNombre} ${log.agent.primerApellido}`,
                totalAvailableTime: 0,
                totalOnCallTime: 0,
                totalWrapUpTime: 0,
                totalBreakTime: 0,
                callsHandled: 0
            };
        }
        
        if (log.duration) {
            switch (log.status) {
                case 'available':
                    agentMetrics[log.userId].totalAvailableTime += log.duration;
                    break;
                case 'on_call':
                    agentMetrics[log.userId].totalOnCallTime += log.duration;
                    agentMetrics[log.userId].callsHandled += 1;
                    break;
                case 'wrap_up':
                    agentMetrics[log.userId].totalWrapUpTime += log.duration;
                    break;
                case 'break':
                    agentMetrics[log.userId].totalBreakTime += log.duration;
                    break;
            }
        }
    });
    
    // Calculate percentages and format
    Object.keys(agentMetrics).forEach(agentId => {
        const metrics = agentMetrics[agentId];
        const totalWorkTime = metrics.totalAvailableTime + metrics.totalOnCallTime + metrics.totalWrapUpTime;
        
        metrics.productivityPercentage = totalWorkTime > 0 
            ? ((metrics.totalOnCallTime / totalWorkTime) * 100).toFixed(2)
            : 0;
        
        // Convert to human readable format
        metrics.totalAvailableTime = Math.floor(metrics.totalAvailableTime / 60); // minutes
        metrics.totalOnCallTime = Math.floor(metrics.totalOnCallTime / 60);
        metrics.totalWrapUpTime = Math.floor(metrics.totalWrapUpTime / 60);
        metrics.totalBreakTime = Math.floor(metrics.totalBreakTime / 60);
    });
    
    return Object.values(agentMetrics);
}