/**
 * Call Model - Sprint 3.1.2
 * Represents call detail records (CDR) for Asterisk/WebRTC telephony
 */

export default (sequelize, DataTypes) => {
    const Call = sequelize.define('Call', {
        callId: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            field: 'call_id',
            comment: 'Asterisk UniqueID'
        },
        agentId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'agent_id',
            comment: 'Associated agent'
        },
        campaignId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'campaign_id',
            comment: 'Associated campaign'
        },
        leadId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'lead_id',
            comment: 'Associated lead/record'
        },
        trunkId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'trunk_id',
            comment: 'SIP trunk used for outbound calls'
        },
        direction: {
            type: DataTypes.ENUM('inbound', 'outbound'),
            allowNull: false,
            validate: {
                isIn: [['inbound', 'outbound']]
            },
            comment: 'Call direction'
        },
        callerNumber: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'caller_number',
            comment: 'Caller phone number'
        },
        calleeNumber: {
            type: DataTypes.STRING(50),
            allowNull: true,
            field: 'callee_number',
            comment: 'Callee phone number'
        },
        startTime: {
            type: DataTypes.DATE,
            allowNull: false,
            field: 'start_time',
            comment: 'Call start timestamp'
        },
        answerTime: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'answer_time',
            comment: 'Call answer timestamp'
        },
        endTime: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'end_time',
            comment: 'Call end timestamp'
        },
        duration: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
            validate: {
                min: 0
            },
            comment: 'Total call duration in seconds'
        },
        billsec: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0,
            validate: {
                min: 0
            },
            comment: 'Billable seconds (after answer)'
        },
        disposition: {
            type: DataTypes.ENUM('ANSWERED', 'NO ANSWER', 'BUSY', 'FAILED', 'CANCELLED'),
            allowNull: true,
            comment: 'Call outcome/disposition'
        },
        recordingUrl: {
            type: DataTypes.STRING(500),
            allowNull: true,
            field: 'recording_url',
            validate: {
                isUrl: {
                    msg: 'Recording URL must be a valid URL'
                }
            },
            comment: 'URL to call recording file'
        },
        // Virtual fields for computed values
        isAnswered: {
            type: DataTypes.VIRTUAL,
            get() {
                return this.disposition === 'ANSWERED';
            }
        },
        durationFormatted: {
            type: DataTypes.VIRTUAL,
            get() {
                if (!this.duration) {return '00:00:00';}
                const hours = Math.floor(this.duration / 3600);
                const minutes = Math.floor((this.duration % 3600) / 60);
                const seconds = this.duration % 60;
                return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }
        },
        billsecFormatted: {
            type: DataTypes.VIRTUAL,
            get() {
                if (!this.billsec) {return '00:00:00';}
                const hours = Math.floor(this.billsec / 3600);
                const minutes = Math.floor((this.billsec % 3600) / 60);
                const seconds = this.billsec % 60;
                return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }
        }
    }, {
        sequelize,
        modelName: 'Call',
        tableName: 'calls',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                unique: true,
                fields: ['call_id'],
                name: 'idx_calls_call_id'
            },
            {
                fields: ['agent_id', 'start_time'],
                name: 'idx_calls_agent_starttime'
            },
            {
                fields: ['campaign_id', 'disposition'],
                name: 'idx_calls_campaign_disposition'
            },
            {
                fields: ['lead_id'],
                name: 'idx_calls_lead_id'
            }
        ]
    });

    /**
     * Define associations
     * Note: Associations are defined in src/models/index.js after all models are loaded
     */
    Call.associate = (models) => {
        // Call belongs to User (agent)
        Call.belongsTo(models.User, {
            foreignKey: 'agentId',
            as: 'agent',
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE'
        });

        // Call belongs to Campana (campaign)
        Call.belongsTo(models.Campana, {
            foreignKey: 'campaignId',
            as: 'campaign',
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE'
        });

        // Call belongs to BaseCampana (lead)
        Call.belongsTo(models.BaseCampana, {
            foreignKey: 'leadId',
            as: 'lead',
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE'
        });

        // Call belongs to Trunk (SIP trunk for outbound)
        Call.belongsTo(models.Trunk, {
            foreignKey: 'trunkId',
            as: 'trunk',
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE'
        });
    };

    /**
     * Instance Methods
     */

    /**
     * Calculate talk time (billsec) from answer and end times
     */
    Call.prototype.calculateBillsec = function() {
        if (this.answerTime && this.endTime) {
            this.billsec = Math.floor((this.endTime - this.answerTime) / 1000);
        }
        return this.billsec;
    };

    /**
     * Calculate total duration from start and end times
     */
    Call.prototype.calculateDuration = function() {
        if (this.startTime && this.endTime) {
            this.duration = Math.floor((this.endTime - this.startTime) / 1000);
        }
        return this.duration;
    };

    /**
     * Class Methods
     */

    /**
     * Get calls by agent with pagination
     */
    Call.getByAgent = async function(agentId, options = {}) {
        const { limit = 50, offset = 0, order = [['startTime', 'DESC']] } = options;

        return await Call.findAndCountAll({
            where: { agentId },
            limit,
            offset,
            order,
            include: [
                { model: sequelize.models.Campana, as: 'campaign' },
                { model: sequelize.models.BaseCampana, as: 'lead' }
            ]
        });
    };

    /**
     * Get calls by campaign with filters
     */
    Call.getByCampaign = async function(campaignId, options = {}) {
        const {
            disposition = null,
            startDate = null,
            endDate = null,
            limit = 100,
            offset = 0
        } = options;

        const where = { campaignId };

        if (disposition) {
            where.disposition = disposition;
        }

        if (startDate || endDate) {
            where.startTime = {};
            if (startDate) {where.startTime[sequelize.Sequelize.Op.gte] = startDate;}
            if (endDate) {where.startTime[sequelize.Sequelize.Op.lte] = endDate;}
        }

        return await Call.findAndCountAll({
            where,
            limit,
            offset,
            order: [['startTime', 'DESC']],
            include: [
                { model: sequelize.models.User, as: 'agent' },
                { model: sequelize.models.BaseCampana, as: 'lead' }
            ]
        });
    };

    /**
     * Get call statistics for an agent
     */
    Call.getAgentStats = async function(agentId, startDate = null, endDate = null) {
        const where = { agentId };

        if (startDate || endDate) {
            where.startTime = {};
            if (startDate) {where.startTime[sequelize.Sequelize.Op.gte] = startDate;}
            if (endDate) {where.startTime[sequelize.Sequelize.Op.lte] = endDate;}
        }

        const calls = await Call.findAll({ where });

        const stats = {
            totalCalls: calls.length,
            answered: calls.filter(c => c.disposition === 'ANSWERED').length,
            noAnswer: calls.filter(c => c.disposition === 'NO ANSWER').length,
            busy: calls.filter(c => c.disposition === 'BUSY').length,
            failed: calls.filter(c => c.disposition === 'FAILED').length,
            cancelled: calls.filter(c => c.disposition === 'CANCELLED').length,
            totalDuration: calls.reduce((sum, c) => sum + (c.duration || 0), 0),
            totalBillsec: calls.reduce((sum, c) => sum + (c.billsec || 0), 0),
            avgDuration: 0,
            avgBillsec: 0,
            answerRate: 0
        };

        if (stats.totalCalls > 0) {
            stats.avgDuration = Math.floor(stats.totalDuration / stats.totalCalls);
            stats.answerRate = ((stats.answered / stats.totalCalls) * 100).toFixed(2);
        }

        if (stats.answered > 0) {
            stats.avgBillsec = Math.floor(stats.totalBillsec / stats.answered);
        }

        return stats;
    };

    /**
     * Get call statistics for a campaign
     */
    Call.getCampaignStats = async function(campaignId, startDate = null, endDate = null) {
        const where = { campaignId };

        if (startDate || endDate) {
            where.startTime = {};
            if (startDate) {where.startTime[sequelize.Sequelize.Op.gte] = startDate;}
            if (endDate) {where.startTime[sequelize.Sequelize.Op.lte] = endDate;}
        }

        const calls = await Call.findAll({
            where,
            include: [{ model: sequelize.models.User, as: 'agent' }]
        });

        const stats = {
            totalCalls: calls.length,
            answered: calls.filter(c => c.disposition === 'ANSWERED').length,
            noAnswer: calls.filter(c => c.disposition === 'NO ANSWER').length,
            busy: calls.filter(c => c.disposition === 'BUSY').length,
            failed: calls.filter(c => c.disposition === 'FAILED').length,
            cancelled: calls.filter(c => c.disposition === 'CANCELLED').length,
            totalDuration: calls.reduce((sum, c) => sum + (c.duration || 0), 0),
            totalBillsec: calls.reduce((sum, c) => sum + (c.billsec || 0), 0),
            avgDuration: 0,
            avgBillsec: 0,
            answerRate: 0,
            uniqueAgents: new Set(calls.map(c => c.agentId).filter(Boolean)).size
        };

        if (stats.totalCalls > 0) {
            stats.avgDuration = Math.floor(stats.totalDuration / stats.totalCalls);
            stats.answerRate = ((stats.answered / stats.totalCalls) * 100).toFixed(2);
        }

        if (stats.answered > 0) {
            stats.avgBillsec = Math.floor(stats.totalBillsec / stats.answered);
        }

        return stats;
    };

    return Call;
};
