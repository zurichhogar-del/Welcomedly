import db from '../models/index.js';
import { Op } from 'sequelize';

const { User, AgentStatusLog, Campana, BaseCampana } = db;

class ReportingService {
    // Get productivity metrics for a specific date range
    async getProductivityMetrics(startDate, endDate, agentId = null) {
        try {
            const whereClause = {
                timestamp: {
                    [Op.between]: [startDate, endDate]
                }
            };
            
            if (agentId) {
                whereClause.userId = agentId;
            }

            const statusLogs = await AgentStatusLog.findAll({
                where: whereClause,
                include: [{
                    model: User,
                    as: 'agent',
                    attributes: ['id', 'primerNombre', 'primerApellido', 'username']
                }],
                order: [['timestamp', 'ASC']]
            });

            return this.processProductivityData(statusLogs);
        } catch (error) {
            console.error('Error getting productivity metrics:', error);
            throw error;
        }
    }

    // Get campaign performance metrics
    async getCampaignPerformance(campaignId = null) {
        try {
            const whereClause = {};
            if (campaignId) {
                whereClause.id = campaignId;
            }

            const campaigns = await Campana.findAll({
                where: whereClause,
                include: [{
                    model: BaseCampana,
                    attributes: ['id']
                }]
            });

            const performanceData = await Promise.all(
                campaigns.map(async (campaign) => {
                    const baseCount = await BaseCampana.count({
                        where: { campanaId: campaign.id }
                    });

                    return {
                        id: campaign.id,
                        name: campaign.nombre,
                        status: campaign.estado,
                        startDate: campaign.fechaInicio,
                        endDate: campaign.fechaFin,
                        totalRecords: baseCount,
                        // Add more metrics as needed
                    };
                })
            );

            return performanceData;
        } catch (error) {
            console.error('Error getting campaign performance:', error);
            throw error;
        }
    }

    // Get agent statistics
    async getAgentStatistics(agentId = null, dateRange = null) {
        try {
            const whereClause = { rol: 'AGENTE' };
            if (agentId) {
                whereClause.id = agentId;
            }

            const agents = await User.findAll({
                where: whereClause,
                attributes: ['id', 'primerNombre', 'primerApellido', 'username', 'status']
            });

            const statistics = await Promise.all(
                agents.map(async (agent) => {
                    const statusWhere = { userId: agent.id };
                    
                    if (dateRange && dateRange.start && dateRange.end) {
                        statusWhere.timestamp = {
                            [Op.between]: [dateRange.start, dateRange.end]
                        };
                    }

                    const statusLogs = await AgentStatusLog.findAll({
                        where: statusWhere,
                        order: [['timestamp', 'DESC']],
                        limit: 100
                    });

                    const stats = this.calculateAgentStats(agent, statusLogs);
                    
                    return {
                        agentId: agent.id,
                        agentName: `${agent.primerNombre} ${agent.primerApellido}`,
                        currentStatus: agent.status,
                        ...stats
                    };
                })
            );

            return statistics;
        } catch (error) {
            console.error('Error getting agent statistics:', error);
            throw error;
        }
    }

    // Get real-time dashboard data
    async getDashboardData() {
        try {
            const now = new Date();
            const startOfDay = new Date(now);
            startOfDay.setHours(0, 0, 0, 0);

            // Get current agent status distribution
            const statusDistribution = await User.findAll({
                where: { rol: 'AGENTE' },
                attributes: [
                    'status',
                    [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
                ],
                group: ['status']
            });

            // Get today's activity summary
            const todayActivity = await AgentStatusLog.findAll({
                where: {
                    timestamp: { [Op.gte]: startOfDay }
                },
                include: [{
                    model: User,
                    as: 'agent',
                    attributes: ['primerNombre', 'primerApellido']
                }]
            });

            // Get active campaigns count
            const activeCampaigns = await Campana.count({
                where: {
                    estado: 'ACTIVA',
                    fechaInicio: { [Op.lte]: now },
                    fechaFin: { [Op.gte]: now }
                }
            });

            return {
                statusDistribution: this.formatStatusDistribution(statusDistribution),
                todayActivity: this.summarizeActivity(todayActivity),
                activeCampaigns,
                timestamp: now
            };
        } catch (error) {
            console.error('Error getting dashboard data:', error);
            throw error;
        }
    }

    // Helper methods
    processProductivityData(statusLogs) {
        const agentData = {};
        
        statusLogs.forEach(log => {
            if (!agentData[log.userId]) {
                agentData[log.userId] = {
                    agentName: `${log.agent.primerNombre} ${log.agent.primerApellido}`,
                    totalCalls: 0,
                    totalTalkTime: 0,
                    totalWrapUpTime: 0,
                    totalBreakTime: 0,
                    totalAvailableTime: 0,
                    loginTime: 0,
                    logoutTime: 0
                };
            }

            const agent = agentData[log.userId];
            
            if (log.duration) {
                switch (log.status) {
                    case 'on_call':
                        agent.totalTalkTime += log.duration;
                        agent.totalCalls += 1;
                        break;
                    case 'wrap_up':
                        agent.totalWrapUpTime += log.duration;
                        break;
                    case 'break':
                        agent.totalBreakTime += log.duration;
                        break;
                    case 'available':
                        agent.totalAvailableTime += log.duration;
                        break;
                }
            }
        });

        // Calculate derived metrics
        Object.keys(agentData).forEach(agentId => {
            const agent = agentData[agentId];
            const totalWorkTime = agent.totalTalkTime + agent.totalWrapUpTime + agent.totalAvailableTime;
            
            agent.averageCallDuration = agent.totalCalls > 0 
                ? Math.floor(agent.totalTalkTime / agent.totalCalls) 
                : 0;
            
            agent.productivityScore = totalWorkTime > 0 
                ? ((agent.totalTalkTime / totalWorkTime) * 100).toFixed(2)
                : 0;
            
            agent.utilizationRate = totalWorkTime > 0 
                ? ((agent.totalTalkTime / (totalWorkTime + agent.totalBreakTime)) * 100).toFixed(2)
                : 0;

            // Convert to human readable format
            agent.totalTalkTime = Math.floor(agent.totalTalkTime / 60); // minutes
            agent.totalWrapUpTime = Math.floor(agent.totalWrapUpTime / 60);
            agent.totalBreakTime = Math.floor(agent.totalBreakTime / 60);
            agent.totalAvailableTime = Math.floor(agent.totalAvailableTime / 60);
            agent.averageCallDuration = Math.floor(agent.averageCallDuration);
        });

        return Object.values(agentData);
    }

    calculateAgentStats(agent, statusLogs) {
        const stats = {
            totalCalls: 0,
            totalTalkTime: 0,
            averageCallTime: 0,
            statusChanges: statusLogs.length,
            lastActivity: statusLogs[0]?.timestamp || null
        };

        statusLogs.forEach(log => {
            if (log.status === 'on_call') {
                stats.totalCalls += 1;
                if (log.duration) {
                    stats.totalTalkTime += log.duration;
                }
            }
        });

        stats.averageCallTime = stats.totalCalls > 0 
            ? Math.floor(stats.totalTalkTime / stats.totalCalls)
            : 0;

        return stats;
    }

    formatStatusDistribution(distribution) {
        const statusMap = {
            'available': 'Disponible',
            'on_call': 'En Llamada',
            'wrap_up': 'Post-llamada',
            'break': 'Pausa',
            'offline': 'Desconectado'
        };

        return distribution.map(item => ({
            status: statusMap[item.status] || item.status,
            count: parseInt(item.dataValues.count),
            percentage: 0 // Will be calculated on frontend
        }));
    }

    summarizeActivity(activity) {
        const summary = {
            totalChanges: activity.length,
            statusChanges: {},
            recentActivity: activity.slice(0, 10).map(log => ({
                agentName: `${log.agent.primerNombre} ${log.agent.primerApellido}`,
                status: log.status,
                timestamp: log.timestamp,
                duration: log.duration
            }))
        };

        activity.forEach(log => {
            if (!summary.statusChanges[log.status]) {
                summary.statusChanges[log.status] = 0;
            }
            summary.statusChanges[log.status] += 1;
        });

        return summary;
    }
}

export default new ReportingService();