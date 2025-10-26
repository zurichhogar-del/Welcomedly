/**
 * Database Connection with Optional Replication Support
 * Fase 4.2: PostgreSQL Primary-Replica
 *
 * This file provides a Sequelize connection that can optionally use
 * read replicas if configured via environment variables.
 *
 * To enable replication, set:
 * - DB_REPLICA1_HOST and/or DB_REPLICA2_HOST in .env
 *
 * Otherwise, it falls back to single primary database.
 */

import { Sequelize } from 'sequelize';
import databaseConfig from '../config/database-replication.js';

// Determine if replication is configured
const useReplication = databaseConfig.replication !== undefined;

let sequelize;

if (useReplication) {
    // Initialize Sequelize with replication
    sequelize = new Sequelize({
        database: databaseConfig.database,
        username: databaseConfig.username,
        password: databaseConfig.password,
        dialect: databaseConfig.dialect,
        replication: databaseConfig.replication,
        pool: databaseConfig.pool,
        logging: databaseConfig.logging,
        timezone: databaseConfig.timezone,
        define: databaseConfig.define,
    });

    const instanceId = process.env.INSTANCE_ID || 'standalone';
    console.log(`[Database:${instanceId}] ✓ Replication enabled:`);
    console.log(`  - Write: ${databaseConfig.replication.write.host}:${databaseConfig.replication.write.port}`);
    databaseConfig.replication.read.forEach((replica, index) => {
        console.log(`  - Read ${index + 1}: ${replica.host}:${replica.port}`);
    });
} else {
    // Initialize Sequelize without replication (single host)
    sequelize = new Sequelize({
        database: databaseConfig.database,
        username: databaseConfig.username,
        password: databaseConfig.password,
        host: databaseConfig.host,
        port: databaseConfig.port,
        dialect: databaseConfig.dialect,
        pool: databaseConfig.pool,
        logging: databaseConfig.logging,
        timezone: databaseConfig.timezone,
        define: databaseConfig.define,
    });

    const instanceId = process.env.INSTANCE_ID || 'standalone';
    console.log(`[Database:${instanceId}] ✓ Single host mode (no replication)`);
    console.log(`  - Database: ${databaseConfig.host}:${databaseConfig.port}`);
}

// Test connection
sequelize
    .authenticate()
    .then(() => {
        const mode = useReplication ? 'replication mode' : 'single-host mode';
        console.log(`[Database] ✓ Connection established (${mode})`);
    })
    .catch((error) => {
        console.error('[Database] ❌ Connection failed:', error.message);
        console.error('[Database] Check your database configuration and ensure PostgreSQL is running');
    });

export default sequelize;
export { useReplication };
