import { DataTypes } from 'sequelize';

/**
 * Modelo para tracking detallado de pausas de agentes
 */
const PauseHistory = (sequelize) => {
    const PauseHistoryModel = sequelize.define('PauseHistory', {
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
        pauseType: {
            type: DataTypes.ENUM('bathroom', 'lunch', 'break', 'coaching', 'system_issue', 'personal'),
            allowNull: false,
            field: 'pause_type'
        },
        reason: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Razón específica de la pausa'
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
        supervisorApproved: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'supervisor_approved'
        },
        supervisorId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'supervisor_id',
            references: {
                model: 'usuarios',
                key: 'id'
            }
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Notas adicionales del supervisor o agente'
        },
        alertSent: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            field: 'alert_sent'
        },
        ipAddress: {
            type: DataTypes.INET,
            allowNull: true,
            field: 'ip_address'
        }
    }, {
        tableName: 'pause_history',
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
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
                fields: ['pause_type']
            },
            {
                fields: ['start_time']
            },
            {
                fields: ['supervisor_id']
            }
        ]
    });

    // Asociaciones
    PauseHistoryModel.associate = (models) => {
        PauseHistoryModel.belongsTo(models.User, {
            foreignKey: 'agentId',
            as: 'agent'
        });
        PauseHistoryModel.belongsTo(models.User, {
            foreignKey: 'supervisorId',
            as: 'supervisor'
        });
    };

    // Métodos de instancia
    PauseHistoryModel.prototype.endPause = function() {
        const now = new Date();
        const duration = Math.floor((now - this.startTime) / 1000);

        return this.update({
            endTime: now,
            duration,
            isActive: false
        });
    };

    // Métodos estáticos
    PauseHistoryModel.getActivePause = async function(agentId) {
        return await this.findOne({
            where: {
                agentId,
                isActive: true
            },
            include: [{
                model: sequelize.models.User,
                as: 'agent',
                attributes: ['id', 'nombre', 'correo']
            }]
        });
    };

    PauseHistoryModel.getCurrentDayStats = async function(agentId = null) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const whereClause = {};
        if (agentId) {
            whereClause.agentId = agentId;
        }

        return await this.findAll({
            where: {
                ...whereClause,
                startTime: {
                    [sequelize.Sequelize.Op.gte]: today
                }
            },
            attributes: [
                'pauseType',
                [sequelize.fn('SUM', sequelize.col('duration')), 'totalDuration'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('AVG', sequelize.col('duration')), 'avgDuration']
            ],
            group: ['pauseType'],
            raw: true
        });
    };

    PauseHistoryModel.getAbnormalPauses = async function(options = {}) {
        const {
            durationThreshold = 1800, // 30 minutos
            hoursAgo = 8
        } = options;

        const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

        return await this.findAll({
            where: {
                startTime: {
                    [sequelize.Sequelize.Op.gte]: cutoffTime
                },
                duration: {
                    [sequelize.Sequelize.Op.gt]: durationThreshold
                }
            },
            include: [{
                model: sequelize.models.User,
                as: 'agent',
                attributes: ['id', 'nombre', 'correo']
            }, {
                model: sequelize.models.User,
                as: 'supervisor',
                attributes: ['id', 'nombre', 'correo']
            }],
            order: [['duration', 'DESC']]
        });
    };

    PauseHistoryModel.getEfficiencyReport = async function(period = 'today') {
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
        }

        return await this.findAll({
            where: {
                startTime: {
                    [sequelize.Sequelize.Op.gte]: startDate
                }
            },
            attributes: [
                'agentId',
                [sequelize.fn('SUM', sequelize.col('duration')), 'totalPauseTime'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'pauseCount']
            ],
            include: [{
                model: sequelize.models.User,
                as: 'agent',
                attributes: ['id', 'nombre', 'correo']
            }],
            group: ['agentId', 'agent.id', 'agent.nombre', 'agent.correo'],
            having: sequelize.where(
                sequelize.fn('SUM', sequelize.col('duration')),
                '>',
                0
            ),
            order: [
                [sequelize.fn('SUM', sequelize.col('duration')), 'DESC']
            ]
        });
    };

    return PauseHistoryModel;
};

export default PauseHistory;