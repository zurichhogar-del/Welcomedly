/**
 * Database Configuration with Read Replicas
 * Fase 4.2: PostgreSQL Primary-Replica Replication
 *
 * This configuration sets up Sequelize with:
 * - Primary database for all write operations
 * - 2 read replicas for read operations (load balanced)
 */

import 'dotenv/config';

const databaseConfig = {
    // Primary database (for writes)
    database: process.env.DB_NAME || 'miappdb',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,

    // Replication configuration
    replication: {
        write: {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 5432,
            username: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'miappdb',
        },
        read: [
            // Replica 1
            {
                host: process.env.DB_REPLICA1_HOST || process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_REPLICA1_PORT) || 5433,
                username: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME || 'miappdb',
            },
            // Replica 2
            {
                host: process.env.DB_REPLICA2_HOST || process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_REPLICA2_PORT) || 5434,
                username: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME || 'miappdb',
            },
        ],
    },

    dialect: 'postgres',

    // Connection pool settings
    pool: {
        max: 10,
        min: 2,
        acquire: 30000,
        idle: 10000,
    },

    // Logging
    logging: process.env.NODE_ENV === 'development' ? console.log : false,

    // Timezone
    timezone: '-05:00',

    // Model settings
    define: {
        timestamps: true,
        underscored: false,
        freezeTableName: true,
    },
};

/**
 * Graceful degradation: If replicas are not configured,
 * fall back to single primary for both read and write
 */
const hasReplicas = process.env.DB_REPLICA1_HOST || process.env.DB_REPLICA2_HOST;

if (!hasReplicas) {
    console.warn('[Database] ⚠️  No replicas configured - using primary for reads and writes');
    // Remove replication config, use simple single-host config
    delete databaseConfig.replication;
    databaseConfig.host = process.env.DB_HOST || 'localhost';
    databaseConfig.port = parseInt(process.env.DB_PORT) || 5432;
}

export default databaseConfig;
