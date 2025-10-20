/**
 * Winston Logger Configuration
 * Centralized logging system for the application
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Definir niveles y colores personalizados
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

winston.addColors(colors);

// Formato personalizado para consola (con colores)
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        info => `${info.timestamp} [${info.level}]: ${info.message}`
    )
);

// Formato para archivos (sin colores)
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
);

// Crear directorio de logs si no existe
const logsDir = path.join(__dirname, '../../logs');

// Transports
const transports = [
    // Consola: solo en desarrollo
    ...(process.env.NODE_ENV !== 'production'
        ? [
              new winston.transports.Console({
                  format: consoleFormat,
              }),
          ]
        : []),

    // Archivo de errores (siempre)
    new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }),

    // Archivo combinado (todos los niveles)
    new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }),
];

// Crear logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    levels,
    transports,
});

// Métodos auxiliares con contexto
logger.logError = (message, error, context = {}) => {
    logger.error(message, {
        error: {
            name: error?.name,
            message: error?.message,
            stack: error?.stack,
        },
        ...context,
    });
};

logger.logRequest = (req, message = 'HTTP Request') => {
    logger.http(message, {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('user-agent'),
    });
};

logger.logSecurity = (event, details) => {
    logger.warn(`[SECURITY] ${event}`, details);
};

logger.logDatabase = (operation, details) => {
    logger.debug(`[DATABASE] ${operation}`, details);
};

logger.logAuth = (action, userId, success, details = {}) => {
    logger.info(`[AUTH] ${action}`, {
        userId,
        success,
        ...details,
    });
};

// Manejo de excepciones no capturadas
if (process.env.NODE_ENV === 'production') {
    logger.exceptions.handle(
        new winston.transports.File({
            filename: path.join(logsDir, 'exceptions.log'),
        })
    );

    logger.rejections.handle(
        new winston.transports.File({
            filename: path.join(logsDir, 'rejections.log'),
        })
    );
}

export default logger;
