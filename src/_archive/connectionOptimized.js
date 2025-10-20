/**
 * Optimized Database Connection with Read Replicas
 * Enterprise-grade PostgreSQL configuration con pooling y sharding
 */

import { Sequelize } from 'sequelize';
import fs from 'fs';
import path from 'path';

class DatabaseManager {
    constructor() {
        this.primary = null;
        this.replicas = [];
        this.analytics = null;
        this.connections = new Map();
        this.queryStats = {
            total: 0,
            read: 0,
            write: 0,
            errors: 0,
            avgResponseTime: 0
        };

        this.initializeConnections();
    }

    /**
     * Inicializar todas las conexiones de base de datos
     */
    async initializeConnections() {
        try {
            console.log('🗄️ Initializing optimized database connections...');

            // Configuración base
            const baseConfig = {
                dialect: 'postgres',
                logging: process.env.NODE_ENV === 'development' ?
                    (msg, timing) => console.log(`🔍 DB: ${msg} (${timing}ms)`) : false,
                pool: {
                    max: 20,
                    min: 5,
                    acquire: 30000,
                    idle: 10000,
                    evict: 1000
                },
                dialectOptions: {
                    ssl: process.env.DB_SSL === 'true' ? {
                        require: true,
                        rejectUnauthorized: false
                    } : false,
                    application_name: 'welcomedly_enterprise',
                    statement_timeout: 30000,
                    query_timeout: 30000,
                    idle_in_transaction_session_timeout: 30000
                },
                benchmark: true,
                query: {
                    raw: false
                }
            };

            // Conexión primaria (escritura)
            this.primary = new Sequelize({
                ...baseConfig,
                host: process.env.DB_PRIMARY_HOST || 'localhost',
                port: process.env.DB_PRIMARY_PORT || 5432,
                database: process.env.DB_NAME || 'miappdb',
                username: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASSWORD,
                name: 'primary',
                replication: {
                    read: this.setupReadReplicas(baseConfig)
                }
            });

            // Conexión para analytics (si es diferente)
            if (process.env.DB_ANALYTICS_HOST) {
                this.analytics = new Sequelize({
                    ...baseConfig,
                    host: process.env.DB_ANALYTICS_HOST,
                    port: process.env.DB_ANALYTICS_PORT || 5432,
                    database: process.env.DB_ANALYTICS_NAME || 'welcomedly_analytics',
                    username: process.env.DB_ANALYTICS_USER || 'postgres',
                    password: process.env.DB_ANALYTICS_PASSWORD,
                    name: 'analytics'
                });
            }

            // Almacenar referencias
            this.connections.set('primary', this.primary);
            this.connections.set('analytics', this.analytics);

            // Probar conexiones
            await this.testConnections();

            // Setup event listeners
            this.setupEventListeners();

            console.log('✅ Database connections initialized successfully');
            console.log(`📊 Primary: ${this.primary.config.host}:${this.primary.config.port}`);
            console.log(`📊 Read Replicas: ${this.primary.config.replication?.read?.length || 0}`);
            if (this.analytics) {
                console.log(`📊 Analytics: ${this.analytics.config.host}:${this.analytics.config.port}`);
            }

        } catch (error) {
            console.error('❌ Failed to initialize database connections:', error);
            throw error;
        }
    }

    /**
     * Configurar read replicas
     */
    setupReadReplicas(baseConfig) {
        const replicas = [];

        // Replica 1
        if (process.env.DB_REPLICA1_HOST) {
            replicas.push({
                host: process.env.DB_REPLICA1_HOST,
                port: process.env.DB_REPLICA1_PORT || 5432,
                database: process.env.DB_NAME || 'miappdb',
                username: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASSWORD
            });
        }

        // Replica 2
        if (process.env.DB_REPLICA2_HOST) {
            replicas.push({
                host: process.env.DB_REPLICA2_HOST,
                port: process.env.DB_REPLICA2_PORT || 5432,
                database: process.env.DB_NAME || 'miappdb',
                username: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASSWORD
            });
        }

        // Si no hay replicas configuradas, usar el primary como read
        if (replicas.length === 0 && process.env.NODE_ENV === 'development') {
            console.log('🔧 No read replicas configured, using primary for reads (development mode)');
            return [{
                host: baseConfig.host || 'localhost',
                port: baseConfig.port || 5432,
                database: process.env.DB_NAME || 'miappdb',
                username: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASSWORD
            }];
        }

        return replicas;
    }

    /**
     * Probar todas las conexiones
     */
    async testConnections() {
        console.log('🧪 Testing database connections...');

        const testConnection = async (connection, name) => {
            try {
                const startTime = Date.now();
                await connection.authenticate();
                const responseTime = Date.now() - startTime;
                console.log(`✅ ${name}: Connected (${responseTime}ms)`);
                return { connected: true, responseTime };
            } catch (error) {
                console.error(`❌ ${name}: Failed to connect - ${error.message}`);
                return { connected: false, error: error.message };
            }
        };

        const results = await Promise.allSettled([
            testConnection(this.primary, 'Primary'),
            ...(this.analytics ? [testConnection(this.analytics, 'Analytics')] : [])
        ]);

        // Verificar que al menos el primary esté conectado
        const primaryResult = results[0];
        if (primaryResult.status === 'rejected' || !primaryResult.value.connected) {
            throw new Error('Primary database connection failed');
        }
    }

    /**
     * Configurar event listeners para monitoreo
     */
    setupEventListeners() {
        if (this.primary) {
            this.primary.addHook('beforeConnect', () => {
                console.log('🔌 Connecting to primary database...');
            });

            this.primary.addHook('afterConnect', () => {
                console.log('✅ Connected to primary database');
            });

            this.primary.addHook('beforeQuery', (options) => {
                options.startTime = Date.now();
                this.queryStats.total++;

                if (this.isReadQuery(options)) {
                    this.queryStats.read++;
                } else {
                    this.queryStats.write++;
                }
            });

            this.primary.addHook('afterQuery', (options) => {
                const responseTime = Date.now() - options.startTime;
                this.updateAverageResponseTime(responseTime);

                if (responseTime > 1000) {
                    console.warn(`⚠️ Slow query detected (${responseTime}ms):`, options.sql?.substring(0, 100));
                }
            });

            this.primary.addHook('queryError', (error, options) => {
                this.queryStats.errors++;
                console.error('❌ Query error:', error.message, options.sql?.substring(0, 100));
            });
        }
    }

    /**
     * Determinar si una query es de lectura
     */
    isReadQuery(options) {
        if (!options || !options.sql) return false;

        const sql = options.sql.trim().toLowerCase();
        const readKeywords = ['select', 'show', 'describe', 'explain', 'with'];
        const firstWord = sql.split(' ')[0];

        return readKeywords.includes(firstWord);
    }

    /**
     * Actualizar tiempo de respuesta promedio
     */
    updateAverageResponseTime(responseTime) {
        const currentAvg = this.queryStats.avgResponseTime;
        const totalQueries = this.queryStats.total;

        this.queryStats.avgResponseTime = ((currentAvg * (totalQueries - 1)) + responseTime) / totalQueries;
    }

    /**
     * Obtener conexión para query específica
     */
    getConnection(queryType = 'read') {
        switch (queryType) {
            case 'analytics':
                return this.analytics || this.primary;
            case 'write':
                return this.primary;
            case 'read':
            default:
                // Sequelize automatically uses read replicas for SELECT queries
                return this.primary;
        }
    }

    /**
     * Ejecutar query con routing automático
     */
    async query(sql, options = {}) {
        const startTime = Date.now();
        const connection = this.getConnection(options.type || 'read');

        try {
            const result = await connection.query(sql, {
                ...options,
                benchmark: true,
                logging: (msg, timing) => {
                    if (process.env.NODE_ENV === 'development' && timing > 500) {
                        console.log(`🐌 Slow query (${timing}ms): ${sql.substring(0, 100)}...`);
                    }
                }
            });

            const responseTime = Date.now() - startTime;

            // Log para queries lentas
            if (responseTime > 1000) {
                console.warn(`⚠️ Query completed in ${responseTime}ms: ${sql.substring(0, 100)}...`);
            }

            return result;
        } catch (error) {
            console.error('❌ Query failed:', error.message, sql.substring(0, 100));
            throw error;
        }
    }

    /**
     * Obtener estadísticas de conexión
     */
    getConnectionStats() {
        return {
            connections: {
                primary: this.primary ? {
                    status: 'connected',
                    pool: {
                        used: this.primary.connectionManager.pool.used,
                        free: this.primary.connectionManager.pool.free,
                        pending: this.primary.connectionManager.pool.pending,
                        max: this.primary.connectionManager.pool.max
                    }
                } : null,
                analytics: this.analytics ? {
                    status: 'connected',
                    pool: {
                        used: this.analytics.connectionManager.pool.used,
                        free: this.analytics.connectionManager.pool.free,
                        pending: this.analytics.connectionManager.pool.pending,
                        max: this.analytics.connectionManager.pool.max
                    }
                } : null
            },
            queries: this.queryStats,
            uptime: process.uptime()
        };
    }

    /**
     * Ejecutar query de analytics
     */
    async analyticsQuery(sql, options = {}) {
        return this.query(sql, {
            ...options,
            type: 'analytics'
        });
    }

    /**
     * Backup de base de datos
     */
    async backup(backupPath = null) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const defaultPath = path.join(process.cwd(), 'backups', `backup-${timestamp}.sql`);
        const finalPath = backupPath || defaultPath;

        // Crear directorio de backups si no existe
        const backupDir = path.dirname(finalPath);
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // Comando pg_dump
        const command = `pg_dump -h ${process.env.DB_PRIMARY_HOST || 'localhost'} -U ${process.env.DB_USER || 'postgres'} -d ${process.env.DB_NAME || 'miappdb'} > ${finalPath}`;

        return new Promise((resolve, reject) => {
            const { exec } = require('child_process');
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ Backup failed:', error);
                    reject(error);
                } else {
                    console.log(`✅ Backup created: ${finalPath}`);
                    resolve({ path: finalPath, size: fs.statSync(finalPath).size });
                }
            });
        });
    }

    /**
     * Restore de base de datos
     */
    async restore(backupPath) {
        if (!fs.existsSync(backupPath)) {
            throw new Error(`Backup file not found: ${backupPath}`);
        }

        const command = `psql -h ${process.env.DB_PRIMARY_HOST || 'localhost'} -U ${process.env.DB_USER || 'postgres'} -d ${process.env.DB_NAME || 'miappdb'} < ${backupPath}`;

        return new Promise((resolve, reject) => {
            const { exec } = require('child_process');
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error('❌ Restore failed:', error);
                    reject(error);
                } else {
                    console.log(`✅ Database restored from: ${backupPath}`);
                    resolve({ path: backupPath });
                }
            });
        });
    }

    /**
     * Optimización de tablas
     */
    async optimizeTables() {
        console.log('🔧 Optimizing database tables...');

        const optimizationQueries = [
            'ANALYZE;',
            'VACUUM ANALYZE;',
            'REINDEX DATABASE miappdb;'
        ];

        for (const query of optimizationQueries) {
            try {
                await this.query(query);
                console.log(`✅ Executed: ${query}`);
            } catch (error) {
                console.warn(`⚠️ Warning executing ${query}:`, error.message);
            }
        }

        console.log('✅ Database optimization completed');
    }

    /**
     * Health check completo
     */
    async healthCheck() {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            connections: {},
            stats: this.queryStats
        };

        try {
            // Test primary connection
            if (this.primary) {
                const start = Date.now();
                await this.primary.query('SELECT 1');
                health.connections.primary = {
                    status: 'healthy',
                    responseTime: Date.now() - start
                };
            }

            // Test analytics connection
            if (this.analytics) {
                const start = Date.now();
                await this.analytics.query('SELECT 1');
                health.connections.analytics = {
                    status: 'healthy',
                    responseTime: Date.now() - start
                };
            }

            // Check query performance
            if (this.queryStats.avgResponseTime > 2000) {
                health.status = 'degraded';
                health.warning = 'High average query response time';
            }

            if (this.queryStats.errors > this.queryStats.total * 0.05) {
                health.status = 'unhealthy';
                health.error = 'High query error rate';
            }

        } catch (error) {
            health.status = 'unhealthy';
            health.error = error.message;
        }

        return health;
    }

    /**
     * Cerrar todas las conexiones
     */
    async close() {
        console.log('🛑 Closing database connections...');

        const closePromises = [];

        if (this.primary) {
            closePromises.push(this.primary.close());
        }

        if (this.analytics) {
            closePromises.push(this.analytics.close());
        }

        try {
            await Promise.all(closePromises);
            console.log('✅ All database connections closed');
        } catch (error) {
            console.error('❌ Error closing connections:', error);
        }
    }

    /**
     * Obtener instancia de Sequelize (compatibilidad con código existente)
     */
    getSequelize() {
        return this.primary;
    }
}

// Crear y exportar instancia única
const dbManager = new DatabaseManager();

export default dbManager;

// Exportar la instancia de Sequelize para compatibilidad
export const sequelize = dbManager.getSequelize();

// Exportar todos los modelos usando el dbManager
import { loadModels } from './models/index.js';
export const db = loadModels(dbManager);