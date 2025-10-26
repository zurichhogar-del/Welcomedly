import { DataTypes } from 'sequelize';

export default (sequelize) => {
    const AgentMetric = sequelize.define(
        'AgentMetric',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            agenteId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                field: 'agente_id',
                references: {
                    model: 'usuarios',
                    key: 'id',
                },
            },
            timestamp: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
                comment: 'Timestamp de la métrica',
            },
            status: {
                type: DataTypes.ENUM(
                    'DISPONIBLE',
                    'EN_LLAMADA',
                    'PAUSADO',
                    'AFTER_CALL_WORK',
                    'OFFLINE'
                ),
                allowNull: false,
                defaultValue: 'DISPONIBLE',
            },
            productiveTime: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                field: 'productive_time',
                comment: 'Tiempo productivo en segundos',
            },
            pauseTime: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                field: 'pause_time',
                comment: 'Tiempo en pausa en segundos',
            },
            callsHandled: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                field: 'calls_handled',
                comment: 'Número de llamadas atendidas',
            },
            salesCount: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                field: 'sales_count',
                comment: 'Número de ventas realizadas',
            },
            avgCallDuration: {
                type: DataTypes.INTEGER,
                allowNull: true,
                field: 'avg_call_duration',
                comment: 'Duración promedio de llamadas en segundos',
            },
            totalTalkTime: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                field: 'total_talk_time',
                comment: 'Tiempo total en llamadas en segundos',
            },
        },
        {
            tableName: 'agent_metrics',
            timestamps: true,
            indexes: [
                {
                    fields: ['agente_id'],
                },
                {
                    fields: ['timestamp'],
                },
                {
                    fields: ['agente_id', 'timestamp'],
                },
            ],
        }
    );

    AgentMetric.associate = (models) => {
        AgentMetric.belongsTo(models.User, {
            foreignKey: 'agenteId',
            as: 'agente',
        });
    };

    return AgentMetric;
};
