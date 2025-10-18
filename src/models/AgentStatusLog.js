export default (sequelize, DataTypes) => {
    const AgentStatusLog = sequelize.define('AgentStatusLog', {
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'usuarios',
                key: 'id'
            }
        },
        status: {
            type: DataTypes.ENUM('available', 'on_call', 'wrap_up', 'break', 'offline'),
            allowNull: false,
            defaultValue: 'offline'
        },
        timestamp: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        duration: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'Duration in seconds for this status'
        },
        metadata: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: 'Additional information about the status change'
        }
    }, {
        sequelize,
        modelName: "AgentStatusLog",
        tableName: "agent_status_logs",
        timestamps: true,
        indexes: [
            {
                fields: ['userId', 'timestamp']
            },
            {
                fields: ['status']
            }
        ]
    });

    AgentStatusLog.associate = function(models) {
        AgentStatusLog.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'agent'
        });
    };

    return AgentStatusLog;
};