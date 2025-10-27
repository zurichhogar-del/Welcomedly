/**
 * Trunk Model - Sprint 3.1.2 Extended
 * Represents SIP trunks for outbound call routing
 */

export default (sequelize, DataTypes) => {
    const Trunk = sequelize.define('Trunk', {
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            validate: {
                len: {
                    args: [3, 100],
                    msg: 'Trunk name must be between 3 and 100 characters'
                }
            },
            comment: 'Trunk friendly name (e.g., "Twilio Main", "Vonage Backup")'
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'Trunk description and notes'
        },
        provider: {
            type: DataTypes.ENUM('twilio', 'vonage', 'bandwidth', 'custom'),
            allowNull: false,
            validate: {
                isIn: [['twilio', 'vonage', 'bandwidth', 'custom']]
            },
            comment: 'Trunk provider type'
        },
        trunkType: {
            type: DataTypes.ENUM('sip', 'iax2', 'pjsip'),
            allowNull: false,
            defaultValue: 'pjsip',
            field: 'trunk_type',
            validate: {
                isIn: [['sip', 'iax2', 'pjsip']]
            },
            comment: 'Asterisk channel technology'
        },
        // SIP/PJSIP Configuration
        host: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: 'Host is required'
                }
            },
            comment: 'SIP server hostname or IP (e.g., sip.twilio.com)'
        },
        port: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 5060,
            validate: {
                min: 1,
                max: 65535
            },
            comment: 'SIP server port (default 5060)'
        },
        username: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'SIP authentication username'
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'SIP authentication password (encrypted)'
        },
        fromUser: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'from_user',
            comment: 'SIP From User (Caller ID)'
        },
        fromDomain: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'from_domain',
            comment: 'SIP From Domain'
        },
        // Routing & Capacity
        maxChannels: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 10,
            field: 'max_channels',
            validate: {
                min: 1,
                max: 1000
            },
            comment: 'Maximum concurrent calls'
        },
        priority: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 10,
            validate: {
                min: 1,
                max: 100
            },
            comment: 'Trunk priority for routing (1=highest, 100=lowest)'
        },
        // Status & Monitoring
        status: {
            type: DataTypes.ENUM('active', 'inactive', 'maintenance', 'error'),
            allowNull: false,
            defaultValue: 'active',
            validate: {
                isIn: [['active', 'inactive', 'maintenance', 'error']]
            },
            comment: 'Trunk operational status'
        },
        registered: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Current registration status with provider'
        },
        lastRegisteredAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'last_registered_at',
            comment: 'Last successful registration timestamp'
        },
        lastErrorAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'last_error_at',
            comment: 'Last error timestamp'
        },
        lastErrorMessage: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'last_error_message',
            comment: 'Last error message'
        },
        // Call Statistics
        totalCalls: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: 'total_calls',
            comment: 'Total calls routed through this trunk'
        },
        successfulCalls: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: 'successful_calls',
            comment: 'Total successful calls'
        },
        failedCalls: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            field: 'failed_calls',
            comment: 'Total failed calls'
        },
        // Advanced Settings (JSONB for flexibility)
        advancedSettings: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: {},
            field: 'advanced_settings',
            comment: 'Advanced trunk settings (codec, dtmf, nat, etc.)'
        },
        // Virtual fields
        isAvailable: {
            type: DataTypes.VIRTUAL,
            get() {
                return this.status === 'active' && this.registered === true;
            }
        },
        successRate: {
            type: DataTypes.VIRTUAL,
            get() {
                if (this.totalCalls === 0) {return 0;}
                return ((this.successfulCalls / this.totalCalls) * 100).toFixed(2);
            }
        },
        failureRate: {
            type: DataTypes.VIRTUAL,
            get() {
                if (this.totalCalls === 0) {return 0;}
                return ((this.failedCalls / this.totalCalls) * 100).toFixed(2);
            }
        }
    }, {
        sequelize,
        modelName: 'Trunk',
        tableName: 'trunks',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                unique: true,
                fields: ['name'],
                name: 'idx_trunks_name'
            },
            {
                fields: ['status', 'registered'],
                name: 'idx_trunks_status_registered'
            },
            {
                fields: ['priority', 'status'],
                name: 'idx_trunks_priority_status'
            },
            {
                fields: ['provider'],
                name: 'idx_trunks_provider'
            }
        ]
    });

    /**
     * Define associations
     */
    Trunk.associate = (models) => {
        // Trunk has many Calls
        Trunk.hasMany(models.Call, {
            foreignKey: 'trunkId',
            as: 'calls',
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE'
        });

        // Trunk can be assigned to Campaigns (many-to-many)
        Trunk.belongsToMany(models.Campana, {
            through: 'campaign_trunks',
            foreignKey: 'trunkId',
            otherKey: 'campanaId',
            as: 'campaigns'
        });
    };

    /**
     * Instance Methods
     */

    /**
     * Update registration status
     */
    Trunk.prototype.updateRegistration = async function(registered) {
        this.registered = registered;
        if (registered) {
            this.lastRegisteredAt = new Date();
            this.status = 'active';
            this.lastErrorAt = null;
            this.lastErrorMessage = null;
        }
        await this.save();
        return this;
    };

    /**
     * Record error
     */
    Trunk.prototype.recordError = async function(errorMessage) {
        this.lastErrorAt = new Date();
        this.lastErrorMessage = errorMessage;
        this.status = 'error';
        this.registered = false;
        await this.save();
        return this;
    };

    /**
     * Increment call statistics
     */
    Trunk.prototype.recordCall = async function(success = true) {
        this.totalCalls += 1;
        if (success) {
            this.successfulCalls += 1;
        } else {
            this.failedCalls += 1;
        }
        await this.save();
        return this;
    };

    /**
     * Activate trunk
     */
    Trunk.prototype.activate = async function() {
        this.status = 'active';
        await this.save();
        return this;
    };

    /**
     * Deactivate trunk
     */
    Trunk.prototype.deactivate = async function() {
        this.status = 'inactive';
        this.registered = false;
        await this.save();
        return this;
    };

    /**
     * Set maintenance mode
     */
    Trunk.prototype.setMaintenance = async function() {
        this.status = 'maintenance';
        this.registered = false;
        await this.save();
        return this;
    };

    /**
     * Class Methods
     */

    /**
     * Get all available trunks ordered by priority
     */
    Trunk.getAvailable = async function() {
        return await Trunk.findAll({
            where: {
                status: 'active',
                registered: true
            },
            order: [['priority', 'ASC']]
        });
    };

    /**
     * Get trunk by name
     */
    Trunk.findByName = async function(name) {
        return await Trunk.findOne({ where: { name } });
    };

    /**
     * Get best trunk for routing (lowest priority number = highest priority)
     */
    Trunk.getBestAvailable = async function() {
        const trunks = await Trunk.getAvailable();

        // Filter by available capacity
        for (const trunk of trunks) {
            const currentCalls = await sequelize.models.Call.count({
                where: {
                    trunkId: trunk.id,
                    endTime: null // Active calls
                }
            });

            if (currentCalls < trunk.maxChannels) {
                return trunk;
            }
        }

        return null; // No available trunks
    };

    /**
     * Get trunk statistics
     */
    Trunk.getStats = async function() {
        const total = await Trunk.count();
        const active = await Trunk.count({ where: { status: 'active' } });
        const registered = await Trunk.count({ where: { registered: true } });
        const error = await Trunk.count({ where: { status: 'error' } });

        const allTrunks = await Trunk.findAll();
        const totalCalls = allTrunks.reduce((sum, t) => sum + t.totalCalls, 0);
        const successfulCalls = allTrunks.reduce((sum, t) => sum + t.successfulCalls, 0);

        return {
            total,
            active,
            registered,
            error,
            inactive: total - active - error,
            totalCalls,
            successfulCalls,
            successRate: totalCalls > 0 ? ((successfulCalls / totalCalls) * 100).toFixed(2) : 0
        };
    };

    /**
     * Test trunk connectivity (placeholder - implement with AMI)
     */
    Trunk.prototype.testConnectivity = async function() {
        // TODO: Implement with Asterisk AMI
        // This would send a SIP OPTIONS request to test connectivity
        return {
            success: false,
            message: 'Test not implemented yet'
        };
    };

    return Trunk;
};
