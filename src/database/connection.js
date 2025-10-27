import { Sequelize } from 'sequelize';
import config from './config.js';
import logger from '../utils/logger.js';

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Configurar logging mejorado con logger estructurado
const sequelizeLogging = dbConfig.logging !== false
    ? (sql, timing) => {
        logger.debug('Sequelize Query', {
            sql: sql.substring(0, 500), // Limitar longitud para legibilidad
            timing: timing ? `${timing}ms` : 'N/A',
            env
        });
    }
    : false;

const sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
        host: dbConfig.host,
        port: dbConfig.port,
        dialect: dbConfig.dialect,
        logging: sequelizeLogging,
        pool: dbConfig.pool || {
            max: 10,
            min: 2,
            acquire: 30000,
            idle: 10000,
            evict: 1000,
            handleDisconnects: true
        },
        // Mejoras adicionales de rendimiento
        benchmark: env === 'development', // Medir tiempo de queries en desarrollo
        dialectOptions: {
            // Configuraciones específicas de PostgreSQL
            ssl: process.env.DB_SSL === 'true' ? {
                require: true,
                rejectUnauthorized: false
            } : false
        }
    }
);

export default sequelize;