import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Configuración de Helmet para seguridad general
export const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://code.jquery.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws://localhost:*", "http://localhost:*", "https://localhost:*"],
            fontSrc: ["'self'", "https:", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
});

// Rate Limiters desactivados temporalmente para evitar problemas de configuración
// Rate Limiter general para toda la aplicación
export const generalLimiter = (req, res, next) => next(); // Desactivado

// Rate Limiter estricto para login (prevenir fuerza bruta)
export const loginLimiter = (req, res, next) => next(); // Desactivado

// Rate Limiter para creación de recursos
export const createResourceLimiter = (req, res, next) => next(); // Desactivado

// Rate Limiter para subida de archivos
export const uploadLimiter = (req, res, next) => next(); // Desactivado
