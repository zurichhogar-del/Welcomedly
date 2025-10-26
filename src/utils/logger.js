/**
 * Winston Logger Configuration
 * Logging estructurado con rotación diaria de archivos
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Crear directorio de logs si no existe
import fs from 'fs';
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Formato personalizado para consola (desarrollo)
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...metadata }) => {
        let msg = `${timestamp} [${level}]: ${message}`;

        // Agregar metadata si existe
        if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
        }

        return msg;
    })
);

// Formato para archivos (JSON estructurado)
const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Configurar transports
const transports = [];

// Transport para logs generales (rotación diaria)
transports.push(
    new DailyRotateFile({
        filename: path.join(logsDir, 'app-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        format: fileFormat,
        level: 'info'
    })
);

// Transport para logs de error (rotación diaria)
transports.push(
    new DailyRotateFile({
        filename: path.join(logsDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        format: fileFormat,
        level: 'error'
    })
);

// Transport para consola en desarrollo
if (process.env.NODE_ENV !== 'production') {
    transports.push(
        new winston.transports.Console({
            format: consoleFormat,
            level: process.env.LOG_LEVEL || 'debug'
        })
    );
}

// Crear logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: fileFormat,
    transports,
    exitOnError: false,
    // Manejar excepciones no capturadas
    exceptionHandlers: [
        new DailyRotateFile({
            filename: path.join(logsDir, 'exceptions-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '30d',
            format: fileFormat
        })
    ],
    // Manejar promesas rechazadas
    rejectionHandlers: [
        new DailyRotateFile({
            filename: path.join(logsDir, 'rejections-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '30d',
            format: fileFormat
        })
    ]
});

// Métodos helper para diferentes niveles de log
logger.logRequest = (req, message = 'HTTP Request') => {
    logger.info(message, {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
};

logger.logError = (error, context = {}) => {
    logger.error(error.message, {
        stack: error.stack,
        ...context
    });
};

logger.logAuth = (action, userId, details = {}) => {
    logger.info(`Auth: ${action}`, {
        userId,
        ...details
    });
};

logger.logAgentStatus = (agentId, status, metadata = {}) => {
    logger.info('Agent Status Change', {
        agentId,
        status,
        ...metadata
    });
};

logger.logMetrics = (metricName, value, metadata = {}) => {
    logger.info(`Metric: ${metricName}`, {
        value,
        ...metadata
    });
};

// Log de inicio
logger.info('Winston Logger initialized', {
    environment: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    logsDirectory: logsDir
});

export default logger;
