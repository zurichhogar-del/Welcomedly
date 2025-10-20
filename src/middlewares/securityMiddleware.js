import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Configuración de Helmet para seguridad general
export const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com"
            ],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://cdn.jsdelivr.net",
                "https://code.jquery.com",
                "https://cdnjs.cloudflare.com"
            ],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: [
                "'self'",
                "ws://localhost:*",
                "http://localhost:*",
                "https://localhost:*",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com"
            ],
            fontSrc: [
                "'self'",
                "https:",
                "data:",
                "https://cdnjs.cloudflare.com",
                "https://fonts.googleapis.com"
            ],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
            childSrc: ["'none'"],
            workerSrc: ["'self'", "blob:"],
            manifestSrc: ["'self'"],
            upgradeInsecureRequests: []
        },
    },
    crossOriginEmbedderPolicy: false,
});

// Rate Limiter general para toda la aplicación
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Máximo 100 requests por ventana
    message: 'Demasiadas solicitudes desde esta IP, intente nuevamente más tarde.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Rate limit excedido',
            message: 'Demasiadas solicitudes. Intente nuevamente en 15 minutos.',
        });
    }
});

// Rate Limiter estricto para login (prevenir fuerza bruta)
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // Máximo 5 intentos de login
    message: 'Demasiados intentos de inicio de sesión, intente nuevamente más tarde.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // No contar requests exitosos
    handler: (req, res) => {
        res.status(429).json({
            error: 'Demasiados intentos de login',
            message: 'Ha excedido el límite de intentos de inicio de sesión. Intente nuevamente en 15 minutos.',
        });
    }
});

// Rate Limiter para creación de recursos
export const createResourceLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 10, // Máximo 10 creaciones por minuto
    message: 'Demasiadas creaciones de recursos, intente nuevamente más tarde.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Rate Limiter para subida de archivos
export const uploadLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 3, // Máximo 3 subidas por minuto
    message: 'Demasiadas subidas de archivos, intente nuevamente más tarde.',
    standardHeaders: true,
    legacyHeaders: false,
});
