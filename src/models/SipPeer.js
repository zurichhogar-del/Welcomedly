/**
 * SipPeer Model - Sprint 3.1.2
 * Represents SIP user accounts for Asterisk/WebRTC telephony
 */

import bcrypt from 'bcrypt';

export default (sequelize, DataTypes) => {
    const SipPeer = sequelize.define('SipPeer', {
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            field: 'user_id',
            comment: 'Associated user account'
        },
        sipUsername: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            field: 'sip_username',
            validate: {
                len: {
                    args: [3, 50],
                    msg: 'SIP username must be between 3 and 50 characters'
                },
                isAlphanumeric: {
                    msg: 'SIP username must be alphanumeric'
                }
            },
            comment: 'SIP username (e.g., agent001)'
        },
        sipPassword: {
            type: DataTypes.STRING(255),
            allowNull: false,
            field: 'sip_password',
            validate: {
                len: {
                    args: [8, 255],
                    msg: 'SIP password must be at least 8 characters'
                }
            },
            comment: 'SIP authentication password (hashed)'
        },
        extension: {
            type: DataTypes.STRING(20),
            allowNull: false,
            unique: true,
            validate: {
                is: {
                    args: /^[0-9]+$/,
                    msg: 'Extension must contain only numbers'
                },
                len: {
                    args: [3, 20],
                    msg: 'Extension must be between 3 and 20 digits'
                }
            },
            comment: 'PBX extension number (e.g., 1001)'
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive', 'disabled'),
            allowNull: false,
            defaultValue: 'active',
            validate: {
                isIn: [['active', 'inactive', 'disabled']]
            },
            comment: 'SIP account status'
        },
        registered: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
            comment: 'Current registration status'
        },
        lastRegisteredAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'last_registered_at',
            comment: 'Last successful registration timestamp'
        },
        userAgent: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'user_agent',
            comment: 'SIP User-Agent string'
        },
        ipAddress: {
            type: DataTypes.STRING(45),
            allowNull: true,
            field: 'ip_address',
            validate: {
                isIP: {
                    msg: 'IP address must be valid IPv4 or IPv6'
                }
            },
            comment: 'Last registered IP address (IPv4/IPv6)'
        },
        // Virtual fields
        isRegistered: {
            type: DataTypes.VIRTUAL,
            get() {
                return this.registered === true && this.status === 'active';
            }
        },
        isActive: {
            type: DataTypes.VIRTUAL,
            get() {
                return this.status === 'active';
            }
        },
        registrationInfo: {
            type: DataTypes.VIRTUAL,
            get() {
                return {
                    registered: this.registered,
                    lastRegisteredAt: this.lastRegisteredAt,
                    userAgent: this.userAgent,
                    ipAddress: this.ipAddress
                };
            }
        }
    }, {
        sequelize,
        modelName: 'SipPeer',
        tableName: 'sip_peers',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        indexes: [
            {
                unique: true,
                fields: ['sip_username'],
                name: 'idx_sip_peers_username'
            },
            {
                unique: true,
                fields: ['extension'],
                name: 'idx_sip_peers_extension'
            },
            {
                fields: ['status', 'registered'],
                name: 'idx_sip_peers_status_registered'
            },
            {
                unique: true,
                fields: ['user_id'],
                name: 'idx_sip_peers_user_id'
            }
        ],
        hooks: {
            /**
             * Hash SIP password before creating peer
             */
            beforeCreate: async (sipPeer) => {
                if (sipPeer.sipPassword) {
                    const salt = await bcrypt.genSalt(10);
                    sipPeer.sipPassword = await bcrypt.hash(sipPeer.sipPassword, salt);
                }
            },

            /**
             * Hash SIP password if changed before updating
             */
            beforeUpdate: async (sipPeer) => {
                if (sipPeer.changed('sipPassword')) {
                    const salt = await bcrypt.genSalt(10);
                    sipPeer.sipPassword = await bcrypt.hash(sipPeer.sipPassword, salt);
                }
            }
        }
    });

    /**
     * Define associations
     * Note: Associations are defined in src/models/index.js after all models are loaded
     */
    SipPeer.associate = (models) => {
        // SipPeer belongs to User (one-to-one)
        SipPeer.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user',
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE'
        });
    };

    /**
     * Instance Methods
     */

    /**
     * Verify SIP password
     */
    SipPeer.prototype.verifyPassword = async function(password) {
        return await bcrypt.compare(password, this.sipPassword);
    };

    /**
     * Update registration status
     */
    SipPeer.prototype.updateRegistration = async function(registered, ipAddress = null, userAgent = null) {
        this.registered = registered;
        this.ipAddress = ipAddress;
        this.userAgent = userAgent;

        if (registered) {
            this.lastRegisteredAt = new Date();
        }

        await this.save();
        return this;
    };

    /**
     * Activate SIP peer
     */
    SipPeer.prototype.activate = async function() {
        this.status = 'active';
        await this.save();
        return this;
    };

    /**
     * Deactivate SIP peer
     */
    SipPeer.prototype.deactivate = async function() {
        this.status = 'inactive';
        this.registered = false;
        await this.save();
        return this;
    };

    /**
     * Disable SIP peer (permanent)
     */
    SipPeer.prototype.disable = async function() {
        this.status = 'disabled';
        this.registered = false;
        await this.save();
        return this;
    };

    /**
     * Class Methods
     */

    /**
     * Find SIP peer by username
     */
    SipPeer.findByUsername = async function(sipUsername) {
        return await SipPeer.findOne({
            where: { sipUsername },
            include: [{ model: sequelize.models.User, as: 'user' }]
        });
    };

    /**
     * Find SIP peer by extension
     */
    SipPeer.findByExtension = async function(extension) {
        return await SipPeer.findOne({
            where: { extension },
            include: [{ model: sequelize.models.User, as: 'user' }]
        });
    };

    /**
     * Find SIP peer by user ID
     */
    SipPeer.findByUserId = async function(userId) {
        return await SipPeer.findOne({
            where: { userId },
            include: [{ model: sequelize.models.User, as: 'user' }]
        });
    };

    /**
     * Get all active SIP peers
     */
    SipPeer.getActive = async function() {
        return await SipPeer.findAll({
            where: {
                status: 'active'
            },
            include: [{ model: sequelize.models.User, as: 'user' }],
            order: [['extension', 'ASC']]
        });
    };

    /**
     * Get all registered SIP peers
     */
    SipPeer.getRegistered = async function() {
        return await SipPeer.findAll({
            where: {
                status: 'active',
                registered: true
            },
            include: [{ model: sequelize.models.User, as: 'user' }],
            order: [['extension', 'ASC']]
        });
    };

    /**
     * Generate unique SIP username from user info
     */
    SipPeer.generateUsername = async function(primerNombre, primerApellido, intentos = 0) {
        let baseUsername = `${primerNombre}${primerApellido}`.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (intentos > 0) {
            baseUsername += intentos;
        }

        const existe = await SipPeer.findOne({ where: { sipUsername: baseUsername } });

        if (existe) {
            return await SipPeer.generateUsername(primerNombre, primerApellido, intentos + 1);
        }

        return baseUsername;
    };

    /**
     * Generate unique extension number
     */
    SipPeer.generateExtension = async function(startFrom = 1001) {
        let extension = startFrom;

        while (true) {
            const existe = await SipPeer.findOne({ where: { extension: extension.toString() } });

            if (!existe) {
                return extension.toString();
            }

            extension++;

            // Safety limit to prevent infinite loop
            if (extension > 9999) {
                throw new Error('No hay extensiones disponibles');
            }
        }
    };

    /**
     * Create SIP peer for user with auto-generated credentials
     */
    SipPeer.createForUser = async function(userId, primerNombre, primerApellido, customPassword = null) {
        const sipUsername = await SipPeer.generateUsername(primerNombre, primerApellido);
        const extension = await SipPeer.generateExtension();

        // Generate random password if not provided
        const sipPassword = customPassword || require('crypto').randomBytes(16).toString('hex');

        return await SipPeer.create({
            userId,
            sipUsername,
            sipPassword, // Will be hashed by beforeCreate hook
            extension,
            status: 'active',
            registered: false
        });
    };

    /**
     * Get SIP peer statistics
     */
    SipPeer.getStats = async function() {
        const total = await SipPeer.count();
        const active = await SipPeer.count({ where: { status: 'active' } });
        const registered = await SipPeer.count({ where: { registered: true } });
        const disabled = await SipPeer.count({ where: { status: 'disabled' } });

        return {
            total,
            active,
            registered,
            disabled,
            inactive: total - active - disabled,
            registrationRate: total > 0 ? ((registered / total) * 100).toFixed(2) : 0
        };
    };

    return SipPeer;
};
