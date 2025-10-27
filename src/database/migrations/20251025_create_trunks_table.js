/**
 * Migration: Create Trunks Table and Update Calls - Sprint 3.1.2 Extended
 * Creates trunks table for SIP trunk management and adds trunk_id to calls
 *
 * Run with: node src/database/migrations/run_js_migration.js 20251025_create_trunks_table.js
 */

import { QueryInterface, DataTypes } from 'sequelize';

export default {
    /**
     * Create trunks table and update calls
     */
    up: async (queryInterface) => {
        console.log('📞 Creando tabla de troncales (trunks)...');

        // 1. Create trunks table
        try {
            await queryInterface.createTable('trunks', {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                name: {
                    type: DataTypes.STRING(100),
                    allowNull: false,
                    unique: true,
                    comment: 'Trunk friendly name'
                },
                description: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                    comment: 'Trunk description'
                },
                provider: {
                    type: DataTypes.ENUM('twilio', 'vonage', 'bandwidth', 'custom'),
                    allowNull: false,
                    comment: 'Trunk provider type'
                },
                trunk_type: {
                    type: DataTypes.ENUM('sip', 'iax2', 'pjsip'),
                    allowNull: false,
                    defaultValue: 'pjsip',
                    comment: 'Asterisk channel technology'
                },
                host: {
                    type: DataTypes.STRING(255),
                    allowNull: false,
                    comment: 'SIP server hostname or IP'
                },
                port: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 5060,
                    comment: 'SIP server port'
                },
                username: {
                    type: DataTypes.STRING(100),
                    allowNull: true,
                    comment: 'SIP authentication username'
                },
                password: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                    comment: 'SIP authentication password'
                },
                from_user: {
                    type: DataTypes.STRING(100),
                    allowNull: true,
                    comment: 'SIP From User'
                },
                from_domain: {
                    type: DataTypes.STRING(255),
                    allowNull: true,
                    comment: 'SIP From Domain'
                },
                max_channels: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 10,
                    comment: 'Maximum concurrent calls'
                },
                priority: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 10,
                    comment: 'Trunk priority for routing'
                },
                status: {
                    type: DataTypes.ENUM('active', 'inactive', 'maintenance', 'error'),
                    allowNull: false,
                    defaultValue: 'active',
                    comment: 'Trunk operational status'
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
                    comment: 'Last successful registration'
                },
                last_error_at: {
                    type: DataTypes.DATE,
                    allowNull: true,
                    comment: 'Last error timestamp'
                },
                last_error_message: {
                    type: DataTypes.TEXT,
                    allowNull: true,
                    comment: 'Last error message'
                },
                total_calls: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                    comment: 'Total calls through trunk'
                },
                successful_calls: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                    comment: 'Total successful calls'
                },
                failed_calls: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 0,
                    comment: 'Total failed calls'
                },
                advanced_settings: {
                    type: DataTypes.JSONB,
                    allowNull: true,
                    defaultValue: {},
                    comment: 'Advanced trunk settings'
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
            console.log('✅ Tabla trunks creada');
        } catch (error) {
            if (!error.message.includes('already exists')) {throw error;}
            console.log('⚠️  Tabla trunks ya existe');
        }

        // 2. Add trunk_id column to calls table
        try {
            await queryInterface.addColumn('calls', 'trunk_id', {
                type: DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'trunks',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL',
                comment: 'SIP trunk used for outbound calls'
            });
            console.log('✅ Columna trunk_id agregada a tabla calls');
        } catch (error) {
            if (!error.message.includes('already exists')) {throw error;}
            console.log('⚠️  Columna trunk_id ya existe en calls');
        }

        // 3. Add indexes
        try {
            await queryInterface.addIndex('trunks', ['name'], {
                name: 'idx_trunks_name',
                unique: true
            });
            console.log('✅ Índice idx_trunks_name creado');
        } catch (error) {
            if (!error.message.includes('already exists')) {throw error;}
            console.log('⚠️  Índice idx_trunks_name ya existe');
        }

        try {
            await queryInterface.addIndex('trunks', ['status', 'registered'], {
                name: 'idx_trunks_status_registered'
            });
            console.log('✅ Índice idx_trunks_status_registered creado');
        } catch (error) {
            if (!error.message.includes('already exists')) {throw error;}
            console.log('⚠️  Índice idx_trunks_status_registered ya existe');
        }

        try {
            await queryInterface.addIndex('trunks', ['priority', 'status'], {
                name: 'idx_trunks_priority_status'
            });
            console.log('✅ Índice idx_trunks_priority_status creado');
        } catch (error) {
            if (!error.message.includes('already exists')) {throw error;}
            console.log('⚠️  Índice idx_trunks_priority_status ya existe');
        }

        try {
            await queryInterface.addIndex('trunks', ['provider'], {
                name: 'idx_trunks_provider'
            });
            console.log('✅ Índice idx_trunks_provider creado');
        } catch (error) {
            if (!error.message.includes('already exists')) {throw error;}
            console.log('⚠️  Índice idx_trunks_provider ya existe');
        }

        try {
            await queryInterface.addIndex('calls', ['trunk_id'], {
                name: 'idx_calls_trunk_id'
            });
            console.log('✅ Índice idx_calls_trunk_id creado');
        } catch (error) {
            if (!error.message.includes('already exists')) {throw error;}
            console.log('⚠️  Índice idx_calls_trunk_id ya existe');
        }

        // 4. Create campaign_trunks junction table for many-to-many relationship
        try {
            await queryInterface.createTable('campaign_trunks', {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                campana_id: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'campanas',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE'
                },
                trunk_id: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    references: {
                        model: 'trunks',
                        key: 'id'
                    },
                    onUpdate: 'CASCADE',
                    onDelete: 'CASCADE'
                },
                priority: {
                    type: DataTypes.INTEGER,
                    allowNull: false,
                    defaultValue: 10,
                    comment: 'Trunk priority for this campaign'
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
            console.log('✅ Tabla campaign_trunks creada');
        } catch (error) {
            if (!error.message.includes('already exists')) {throw error;}
            console.log('⚠️  Tabla campaign_trunks ya existe');
        }

        try {
            await queryInterface.addIndex('campaign_trunks', ['campana_id', 'trunk_id'], {
                name: 'idx_campaign_trunks_unique',
                unique: true
            });
            console.log('✅ Índice idx_campaign_trunks_unique creado');
        } catch (error) {
            if (!error.message.includes('already exists')) {throw error;}
            console.log('⚠️  Índice idx_campaign_trunks_unique ya existe');
        }

        console.log('✅ Tabla de troncales y relaciones creadas exitosamente');
        return Promise.resolve();
    },

    /**
     * Drop trunks table and remove trunk_id from calls (rollback)
     */
    down: async (queryInterface) => {
        console.log('🗑️  Eliminando tabla de troncales...');

        try {
            await queryInterface.dropTable('campaign_trunks');
            console.log('✅ Tabla campaign_trunks eliminada');
        } catch (error) {
            console.log('⚠️  Error eliminando tabla campaign_trunks:', error.message);
        }

        try {
            await queryInterface.removeColumn('calls', 'trunk_id');
            console.log('✅ Columna trunk_id eliminada de calls');
        } catch (error) {
            console.log('⚠️  Error eliminando columna trunk_id:', error.message);
        }

        try {
            await queryInterface.dropTable('trunks');
            console.log('✅ Tabla trunks eliminada');
        } catch (error) {
            console.log('⚠️  Error eliminando tabla trunks:', error.message);
        }

        console.log('✅ Rollback de troncales completado');
        return Promise.resolve();
    }
};
