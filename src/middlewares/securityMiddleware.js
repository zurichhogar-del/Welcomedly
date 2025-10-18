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
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https:", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
});

// Rate Limiter general para toda la aplicación
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Máximo 100 solicitudes por ventana
    message: 'Demasiadas solicitudes desde esta IP, por favor intenta de nuevo más tarde.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate Limiter estricto para login (prevenir fuerza bruta)
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Máximo 5 intentos de login
    message: 'Demasiados intentos de inicio de sesión. Por favor intenta de nuevo en 15 minutos.',
    skipSuccessfulRequests: true, // No contar requests exitosos
});

// Rate Limiter para creación de recursos
export const createResourceLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 10, // Máximo 10 creaciones por minuto
    message: 'Demasiadas solicitudes de creación. Por favor espera un momento.',
});

// Rate Limiter para subida de archivos
export const uploadLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 3, // Máximo 3 uploads por minuto
    message: 'Demasiadas subidas de archivos. Por favor espera un momento.',
});
