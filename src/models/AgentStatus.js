import { DataTypes } from 'sequelize';

/**
 * Modelo para tracking de estados de agentes en tiempo real
 */
const AgentStatus = (sequelize) => {
    const AgentStatusModel = sequelize.define('AgentStatus', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        agentId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'agente_id',
            references: {
                model: 'usuarios',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        status: {
            type: DataTypes.ENUM('available', 'in_call', 'on_pause', 'after_call_work', 'training', 'meeting', 'offline'),
            allowNull: false,
            defaultValue: 'offline'
        },
        previousStatus: {
            type: DataTypes.ENUM('available', 'in_call', 'on_pause', 'after_call_work', 'training', 'meeting', 'offline'),
            allowNull: true,
            field: 'previous_status'
        },
        reason: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Razón del cambio de estado o pausa'
        },
        metadata: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
            comment: 'Información adicional del estado'
        },
        startTime: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'start_time'
        },
        endTime: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'end_time'
        },
        duration: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Duración en segundos'
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            field: 'is_active'
        },
        ipAddress: {
            type: DataTypes.INET,
            allowNull: true,
            field: 'ip_address'
        },
        userAgent: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'user_agent'
        }
    }, {
        tableName: 'agent_status_log',
        timestamps: true,
        updatedAt: false,
        createdAt: 'created_at',
        indexes: [
            {
                unique: true,
                fields: ['agente_id', 'is_active'],
                where: {
                    is_active: true
                }
            },
            {
                fields: ['agente_id', 'created_at']
            },
            {
                fields: ['status']
            },
            {
                fields: ['start_time']
            }
        ]
    });

    // Asociaciones
    AgentStatusModel.associate = (models) => {
        AgentStatusModel.belongsTo(models.User, {
            foreignKey: 'agentId',
            as: 'agent'
        });
    };

    // Métodos de instancia
    AgentStatusModel.prototype.endStatus = function() {
        const now = new Date();
        const duration = Math.floor((now - this.startTime) / 1000);

        return this.update({
            endTime: now,
            duration,
            isActive: false
        });
    };

    // Métodos estáticos
    AgentStatusModel.getCurrentStatus = async function(agentId) {
        return await this.findOne({
            where: {
                agentId,
                isActive: true
            },
            include: [{
                model: sequelize.models.User,
                as: 'agent',
                attributes: ['id', 'nombre', 'correo', 'rol']
            }]
        });
    };

    AgentStatusModel.getStatusHistory = async function(agentId, options = {}) {
        const {
            startDate,
            endDate,
            limit = 100,
            offset = 0
        } = options;

        const whereClause = {
            agentId
        };

        if (startDate && endDate) {
            whereClause.startTime = {
                [sequelize.Sequelize.Op.between]: [startDate, endDate]
            };
        }

        return await this.findAll({
            where: whereClause,
            order: [['startTime', 'DESC']],
            limit,
            offset,
            include: [{
                model: sequelize.models.User,
                as: 'agent',
                attributes: ['id', 'nombre', 'correo', 'rol']
            }]
        });
    };

    AgentStatusModel.getActiveAgents = async function(status = 'available') {
        return await this.findAll({
            where: {
                status,
                isActive: true
            },
            include: [{
                model: sequelize.models.User,
                as: 'agent',
                attributes: ['id', 'nombre', 'correo', 'rol'],
                where: {
                    estado: 'ACTIVO'
                }
            }]
        });
    };

    AgentStatusModel.getAgentMetrics = async function(agentId, period = 'today') {
        const now = new Date();
        let startDate;

        switch (period) {
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
                startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }

        const statuses = await this.findAll({
            where: {
                agentId,
                startTime: {
                    [sequelize.Sequelize.Op.gte]: startDate
                }
            },
            attributes: [
                'status',
                [sequelize.fn('SUM', sequelize.col('duration')), 'totalDuration'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['status'],
            raw: true
        });

        return statuses.reduce((acc, status) => {
            acc[status.status] = {
                duration: parseInt(status.totalDuration) || 0,
                count: parseInt(status.count) || 0
            };
            return acc;
        }, {});
    };

    return AgentStatusModel;
};

export default AgentStatus;