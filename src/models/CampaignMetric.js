import { DataTypes } from 'sequelize';

export default (sequelize) => {
    const CampaignMetric = sequelize.define(
        'CampaignMetric',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            campanaId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                field: 'campana_id',
                references: {
                    model: 'campanas',
                    key: 'id',
                },
            },
            timestamp: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
                comment: 'Timestamp de la métrica',
            },
            totalLeads: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                field: 'total_leads',
                comment: 'Total de leads en la campaña',
            },
            contactedLeads: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                field: 'contacted_leads',
                comment: 'Leads contactados',
            },
            successfulCalls: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                field: 'successful_calls',
                comment: 'Llamadas exitosas',
            },
            failedCalls: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                field: 'failed_calls',
                comment: 'Llamadas fallidas',
            },
            conversionRate: {
                type: DataTypes.DECIMAL(5, 2),
                allowNull: true,
                field: 'conversion_rate',
                comment: 'Tasa de conversión en porcentaje',
            },
            avgCallDuration: {
                type: DataTypes.INTEGER,
                allowNull: true,
                field: 'avg_call_duration',
                comment: 'Duración promedio de llamadas en segundos',
            },
            totalCallTime: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                field: 'total_call_time',
                comment: 'Tiempo total de llamadas en segundos',
            },
            activeAgents: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                field: 'active_agents',
                comment: 'Número de agentes activos',
            },
        },
        {
            tableName: 'campaign_metrics',
            timestamps: true,
            indexes: [
                {
                    fields: ['campana_id'],
                },
                {
                    fields: ['timestamp'],
                },
                {
                    fields: ['campana_id', 'timestamp'],
                },
            ],
        }
    );

    CampaignMetric.associate = (models) => {
        CampaignMetric.belongsTo(models.Campana, {
            foreignKey: 'campanaId',
            as: 'campana',
        });
    };

    return CampaignMetric;
};
