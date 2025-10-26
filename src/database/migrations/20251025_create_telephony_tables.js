/**
 * Migration: Create Telephony Tables - Sprint 3.1.2
 * Creates calls and sip_peers tables for Asterisk/WebRTC integration
 *
 * Run with: node src/database/migrations/run_migration.js
 */

import { QueryInterface, DataTypes } from 'sequelize';

export default {
    /**
     * Create telephony tables
     */
    up: async (queryInterface) => {
        console.log('📞 Creando tablas de telefonía...');

        // 1. Create calls table (Call Detail Records)
        try {
            await queryInterface.createTable('calls', {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                call_id: {
                    type: DataTypes.STRING(255),
                    allowNull: false,
                    unique: true,
                    comment: 'Asterisk UniqueID'
                },
                agent_id: {
                    type: DataTypes.INTEGER,
                    allowNull: true,
                    references: {
                        model: 'usuarios',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'SET NULL'
                },
                campaign_id: {
                    type: DataTypes.INTEGER,
                    allowNull: true,
                    references: {
                        model: 'campanas',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'SET NULL'
                },
                lead_id: {
                    type: DataTypes.INTEGER,
                    allowNull: true,
                    references: {
                        model: 'base_campanas',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'SET NULL'
                },
                direction: {
                    type: DataTypes.ENUM('inbound', 'outbound'),
                    allowNull: false,
                    comment: 'Call direction: inbound or outbound'
                },
                caller_number: {
                    type: DataTypes.STRING(50),
                    allowNull: true,
                    comment: 'Caller phone number'
                },
                callee_number: {
                    type: DataTypes.STRING(50),
                    allowNull: true,
                    comment: 'Callee phone number'
                },
                start_time: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    comment: 'Call start timestamp'
                },
                answer_time: {
                    type: DataTypes.DATE,
                    allowNull: true,
                    comment: 'Call answer timestamp'
                },
                end_time: {
                    type: DataTypes.DATE,
                    allowNull: true,
                    comment: 'Call end timestamp'
                },
                duration: {
                    type: DataTypes.INTEGER,
                    allowNull: true,
                    defaultValue: 0,
                    comment: 'Total call duration in seconds'
                },
                billsec: {
                    type: DataTypes.INTEGER,
                    allowNull: true,
                    defaultValue: 0,
                    comment: 'Billable seconds (after answer)'
                },
                disposition: {
                    type: DataTypes.ENUM('ANSWERED', 'NO ANSWER', 'BUSY', 'FAILED', 'CANCELLED'),
                    allowNull: true,
                    comment: 'Call outcome/disposition'
                },
                recording_url: {
                    type: DataTypes.STRING(500),
                    allowNull: true,
                    comment: 'URL to call recording file'
                },
                created_at: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: DataTypes.NOW
                },
                updated_at: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: DataTypes.NOW
                }
            });
            console.log('✅ Tabla calls creada');
        } catch (error) {
            if (!error.message.includes('already exists')) throw error;
            console.log('⚠️  Tabla calls ya existe');
        }

        // 2. Create sip_peers table (SIP User Accounts)
        try {
            await queryInterface.createTable('sip_peers', {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                user_id: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    unique: true,
                    references: {
                        model: 'usuarios',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE',
                    comment: 'Associated user account'
                },
                sip_username: {
                    type: DataTypes.STRING(50),
                    allowNull: false,
                    unique: true,
                    comment: 'SIP username (e.g., agent001)'
                },
                sip_password: {
                    type: DataTypes.STRING(255),
                    allowNull: false,
                    comment: 'SIP authentication password (hashed)'
                },
                extension: {
                    type: DataTypes.STRING(20),
                    allowNull: false,
                    unique: true,
                    comment: 'PBX extension number (e.g., 1001)'
                },
                status: {
                    type: DataTypes.ENUM('active', 'inactive', 'disabled'),
                    allowNull: false,
                    defaultValue: 'active',
                    comment: 'SIP account status'
                },
                registered: {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false,
                    comment: 'Current registration status'
                },
                last_registered_at: {
                    type: DataTypes.DATE,
                    allowNull: true,
                    comment: 'Last successful registration timestamp'
                },
                user_agent: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                    comment: 'SIP User-Agent string'
                },
                ip_address: {
                    type: DataTypes.STRING(45),
                    allowNull: true,
                    comment: 'Last registered IP address (IPv4/IPv6)'
                },
                created_at: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: DataTypes.NOW
                },
                updated_at: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: DataTypes.NOW
                }
            });
            console.log('✅ Tabla sip_peers creada');
        } catch (error) {
            if (!error.message.includes('already exists')) throw error;
            console.log('⚠️  Tabla sip_peers ya existe');
        }

        // 3. Add indexes for performance
        try {
            // Index on call_id for quick lookup
            await queryInterface.addIndex('calls', ['call_id'], {
                name: 'idx_calls_call_id',
                unique: true
            });
            console.log('✅ Índice idx_calls_call_id creado');
        } catch (error) {
            if (!error.message.includes('already exists')) throw error;
            console.log('⚠️  Índice idx_calls_call_id ya existe');
        }

        try {
            // Index for agent call history queries
            await queryInterface.addIndex('calls', ['agent_id', 'start_time'], {
                name: 'idx_calls_agent_starttime'
            });
            console.log('✅ Índice idx_calls_agent_starttime creado');
        } catch (error) {
            if (!error.message.includes('already exists')) throw error;
            console.log('⚠️  Índice idx_calls_agent_starttime ya existe');
        }

        try {
            // Index for campaign call reports
            await queryInterface.addIndex('calls', ['campaign_id', 'disposition'], {
                name: 'idx_calls_campaign_disposition'
            });
            console.log('✅ Índice idx_calls_campaign_disposition creado');
        } catch (error) {
            if (!error.message.includes('already exists')) throw error;
            console.log('⚠️  Índice idx_calls_campaign_disposition ya existe');
        }

        try {
            // Index for lead call tracking
            await queryInterface.addIndex('calls', ['lead_id'], {
                name: 'idx_calls_lead_id'
            });
            console.log('✅ Índice idx_calls_lead_id creado');
        } catch (error) {
            if (!error.message.includes('already exists')) throw error;
            console.log('⚠️  Índice idx_calls_lead_id ya existe');
        }

        try {
            // Index on sip_username for authentication
            await queryInterface.addIndex('sip_peers', ['sip_username'], {
                name: 'idx_sip_peers_username',
                unique: true
            });
            console.log('✅ Índice idx_sip_peers_username creado');
        } catch (error) {
            if (!error.message.includes('already exists')) throw error;
            console.log('⚠️  Índice idx_sip_peers_username ya existe');
        }

        try {
            // Index on extension for routing
            await queryInterface.addIndex('sip_peers', ['extension'], {
                name: 'idx_sip_peers_extension',
                unique: true
            });
            console.log('✅ Índice idx_sip_peers_extension creado');
        } catch (error) {
            if (!error.message.includes('already exists')) throw error;
            console.log('⚠️  Índice idx_sip_peers_extension ya existe');
        }

        try {
            // Index for active registered peers
            await queryInterface.addIndex('sip_peers', ['status', 'registered'], {
                name: 'idx_sip_peers_status_registered'
            });
            console.log('✅ Índice idx_sip_peers_status_registered creado');
        } catch (error) {
            if (!error.message.includes('already exists')) throw error;
            console.log('⚠️  Índice idx_sip_peers_status_registered ya existe');
        }

        console.log('✅ Tablas de telefonía creadas exitosamente');
        return Promise.resolve();
    },

    /**
     * Drop telephony tables (rollback)
     */
    down: async (queryInterface) => {
        console.log('🗑️  Eliminando tablas de telefonía...');

        try {
            await queryInterface.dropTable('calls');
            console.log('✅ Tabla calls eliminada');
        } catch (error) {
            console.log('⚠️  Error eliminando tabla calls:', error.message);
        }

        try {
            await queryInterface.dropTable('sip_peers');
            console.log('✅ Tabla sip_peers eliminada');
        } catch (error) {
            console.log('⚠️  Error eliminando tabla sip_peers:', error.message);
        }

        console.log('✅ Rollback de tablas de telefonía completado');
        return Promise.resolve();
    }
};
