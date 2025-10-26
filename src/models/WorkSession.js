import { DataTypes } from 'sequelize';

/**
 * Modelo para tracking de sesiones de trabajo de agentes
 */
const WorkSession = (sequelize) => {
    const WorkSessionModel = sequelize.define('WorkSession', {
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
        loginTime: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'login_time'
        },
        logoutTime: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'logout_time'
        },
        totalDuration: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'total_duration',
            comment: 'Duración total en segundos'
        },
        productiveTime: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
            field: 'productive_time',
            comment: 'Tiempo productivo en segundos'
        },
        pauseTime: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
            field: 'pause_time',
            comment: 'Tiempo en pausa en segundos'
        },
        callTime: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
            field: 'call_time',
            comment: 'Tiempo en llamada en segundos'
        },
        afterCallWorkTime: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
            field: 'after_call_work_time',
            comment: 'Tiempo post-llamada en segundos'
        },
        callsHandled: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: 'calls_handled'
        },
        salesCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: 'sales_count'
        },
        qualityScore: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            field: 'quality_score',
            validate: {
                min: 0,
                max: 100
            }
        },
        customerSatisfaction: {
            type: DataTypes.DECIMAL(3, 1),
            allowNull: true,
            field: 'customer_satisfaction',
            validate: {
                min: 0,
                max: 5
            }
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
            field: 'is_active'
        },
        campaignId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'campaign_id',
            references: {
                model: 'campanas',
                key: 'id'
            }
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
        },
        loginType: {
            type: DataTypes.ENUM('regular', 'remote', 'vpn'),
            allowNull: false,
            defaultValue: 'regular',
            field: 'login_type'
        }
    }, {
        tableName: 'work_sessions',
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
                fields: ['agente_id', 'login_time']
            },
            {
                fields: ['campaign_id']
            },
            {
                fields: ['login_time']
            }
        ]
    });

    // Asociaciones
    WorkSessionModel.associate = (models) => {
        WorkSessionModel.belongsTo(models.User, {
            foreignKey: 'agentId',
            as: 'agent'
        });
        WorkSessionModel.belongsTo(models.Campana, {
            foreignKey: 'campaignId',
            as: 'campaign'
        });
    };

    // Métodos de instancia
    WorkSessionModel.prototype.endSession = function() {
        const now = new Date();
        const totalDuration = Math.floor((now - this.loginTime) / 1000);

        return this.update({
            logoutTime: now,
            totalDuration,
            isActive: false
        });
    };

    WorkSessionModel.prototype.updateMetrics = function(metrics) {
        return this.update({
            productiveTime: metrics.productiveTime || this.productiveTime,
            pauseTime: metrics.pauseTime || this.pauseTime,
            callTime: metrics.callTime || this.callTime,
            afterCallWorkTime: metrics.afterCallWorkTime || this.afterCallWorkTime,
            callsHandled: metrics.callsHandled || this.callsHandled,
            salesCount: metrics.salesCount || this.salesCount,
            qualityScore: metrics.qualityScore || this.qualityScore,
            customerSatisfaction: metrics.customerSatisfaction || this.customerSatisfaction
        });
    };

    // Métodos estáticos
    WorkSessionModel.getActiveSession = async function(agentId) {
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

    WorkSessionModel.getCurrentDaySessions = async function() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return await this.findAll({
            where: {
                loginTime: {
                    [sequelize.Sequelize.Op.gte]: today
                }
            },
            include: [{
                model: sequelize.models.User,
                as: 'agent',
                attributes: ['id', 'nombre', 'correo'],
                where: {
                    estado: 'ACTIVO'
                }
            }]
        });
    };

    WorkSessionModel.getProductivityReport = async function(period = 'today') {
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
                loginTime: {
                    [sequelize.Sequelize.Op.gte]: startDate
                }
            },
            attributes: [
                'agentId',
                [sequelize.fn('SUM', sequelize.col('total_duration')), 'totalTime'],
                [sequelize.fn('SUM', sequelize.col('productive_time')), 'productiveTime'],
                [sequelize.fn('SUM', sequelize.col('pause_time')), 'pauseTime'],
                [sequelize.fn('SUM', sequelize.col('call_time')), 'callTime'],
                [sequelize.fn('SUM', sequelize.col('calls_handled')), 'totalCalls'],
                [sequelize.fn('SUM', sequelize.col('sales_count')), 'totalSales'],
                [sequelize.fn('AVG', sequelize.col('quality_score')), 'avgQuality'],
                [sequelize.fn('AVG', sequelize.col('customer_satisfaction')), 'avgSatisfaction'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'sessionCount']
            ],
            include: [{
                model: sequelize.models.User,
                as: 'agent',
                attributes: ['id', 'nombre', 'correo']
            }],
            group: ['agentId', 'agent.id', 'agent.nombre', 'agent.correo'],
            having: sequelize.where(
                sequelize.fn('SUM', sequelize.col('total_duration')),
                '>',
                0
            ),
            order: [
                [sequelize.fn('SUM', sequelize.col('productive_time')), 'DESC']
            ]
        });
    };

    WorkSessionModel.getShiftAnalysis = async function(shiftType = 'morning', date = new Date()) {
        let startTime, endTime;

        switch (shiftType) {
            case 'morning': // 6:00 - 14:00
                startTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 6, 0, 0);
                endTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 14, 0, 0);
                break;
            case 'afternoon': // 14:00 - 22:00
                startTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 14, 0, 0);
                endTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 22, 0, 0);
                break;
            case 'night': // 22:00 - 6:00
                startTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 22, 0, 0);
                endTime = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 6, 0, 0);
                break;
        }

        return await this.findAll({
            where: {
                loginTime: {
                    [sequelize.Sequelize.Op.between]: [startTime, endTime]
                }
            },
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'agentCount'],
                [sequelize.fn('AVG', sequelize.col('total_duration')), 'avgSessionDuration'],
                [sequelize.fn('AVG', sequelize.col('productive_time')), 'avgProductiveTime'],
                [sequelize.fn('AVG', sequelize.col('calls_handled')), 'avgCallsPerSession']
            ]
        });
    };

    return WorkSessionModel;
};

export default WorkSession;