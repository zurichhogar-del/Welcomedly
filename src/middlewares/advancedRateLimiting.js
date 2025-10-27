/**
 * Advanced Rate Limiting Middleware - Sprint 2.4
 * Rate limiting con Redis store, por usuario autenticado, y diferentes límites por rol
 */

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisClient from '../database/redisClient.js';
import logger from '../utils/logger.js';

/**
 * Crear key personalizada para rate limiting
 * Usa userId si está autenticado, sino usa IP
 * Compatible con IPv6 usando el default key generator
 */
const createRateLimitKey = (req, res) => {
    if (req.session?.usuario?.id) {
        return `ratelimit:user:${req.session.usuario.id}`;
    }
    // Para IPs, dejar que express-rate-limit use su generador por defecto
    // que maneja IPv6 correctamente
    return undefined;
};

/**
 * Configuración de Redis Store para rate limiting
 * Sprint 2.4.1: Persistir límites en Redis (distribuido y escalable)
 */
const createRedisStore = (prefix) => {
    return new RedisStore({
        // @ts-expect-error - rate-limit-redis acepta cliente ioredis
        client: redisClient,
        prefix: `rate:${prefix}:`,
        sendCommand: (...args) => redisClient.call(...args)
    });
};

/**
 * Handler personalizado para rate limit excedido
 * Sprint 2.4.3: Logging y monitoreo de rate limits
 */
const rateLimitHandler = (req, res, limitName) => {
    const userId = req.session?.usuario?.id || 'anonymous';
    const userRole = req.session?.usuario?.rol || 'guest';

    logger.warn('Rate limit exceeded', {
        limitName,
        userId,
        userRole,
        ip: req.ip,
        path: req.path,
        method: req.method
    });

    res.status(429).json({
        error: 'Rate limit excedido',
        message: `Ha excedido el límite de solicitudes para ${limitName}. Intente nuevamente más tarde.`,
        retryAfter: res.getHeader('Retry-After')
    });
};

/**
 * Rate Limiter general con Redis store
 * Sprint 2.4.1: 100 req/15min por usuario o IP
 */
export const advancedGeneralLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisStore('general'),
    keyGenerator: createRateLimitKey,
    handler: (req, res) => rateLimitHandler(req, res, 'general'),
    skip: (req) => {
        // Admins tienen límite más alto
        if (req.session?.usuario?.rol === 'ADMIN') {
            return false; // No skip, pero usará skipSuccessfulRequests
        }
        return false;
    }
});

/**
 * Rate Limiter para login con Redis
 * Sprint 2.4.1: 5 intentos/15min por IP (prevenir fuerza bruta)
 */
export const advancedLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisStore('login'),
    // Usar default keyGenerator para manejo correcto de IPv6
    skipSuccessfulRequests: true, // No contar logins exitosos
    handler: (req, res) => {
        // Logging integrado en el handler (onLimitReached está deprecated)
        logger.error('Login rate limit reached - possible brute force attack', {
            ip: req.ip,
            username: req.body.correo || req.body.username,
            userAgent: req.get('user-agent')
        });
        rateLimitHandler(req, res, 'login');
    }
});

/**
 * Rate Limiter para API endpoints por usuario
 * Sprint 2.4.2: Diferentes límites según rol
 */
export const createApiLimiter = (options = {}) => {
    const {
        windowMs = 60 * 1000, // 1 minuto por defecto
        maxPerUser = 30, // Límite para usuarios normales
        maxPerAdmin = 100, // Límite para admins
        name = 'api'
    } = options;

    return rateLimit({
        windowMs,
        max: async (req) => {
            // Sprint 2.4.2: Límites diferentes por rol
            if (req.session?.usuario?.rol === 'ADMIN') {
                return maxPerAdmin;
            }
            return maxPerUser;
        },
        standardHeaders: true,
        legacyHeaders: false,
        store: createRedisStore(name),
        keyGenerator: createRateLimitKey,
        handler: (req, res) => rateLimitHandler(req, res, name),
        skip: (req) => {
            // Saltar rate limit para health checks
            if (req.path.startsWith('/health')) {
                return true;
            }
            return false;
        }
    });
};

/**
 * Rate Limiter para creación de recursos con Redis
 * Sprint 2.4.1: 10 creaciones/minuto (AGENTE), 30/minuto (ADMIN)
 */
export const advancedCreateResourceLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: async (req) => {
        if (req.session?.usuario?.rol === 'ADMIN') {
            return 30; // Admins pueden crear más recursos
        }
        return 10; // Agentes limitados a 10/minuto
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisStore('create'),
    keyGenerator: createRateLimitKey,
    handler: (req, res) => rateLimitHandler(req, res, 'create resource')
});

/**
 * Rate Limiter para uploads con Redis
 * Sprint 2.4.1: 3 uploads/minuto (AGENTE), 10/minuto (ADMIN)
 */
export const advancedUploadLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: async (req) => {
        if (req.session?.usuario?.rol === 'ADMIN') {
            return 10; // Admins pueden subir más archivos
        }
        return 3; // Agentes limitados a 3/minuto
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: createRedisStore('upload'),
    keyGenerator: createRateLimitKey,
    handler: (req, res) => rateLimitHandler(req, res, 'file upload')
});

/**
 * Rate Limiter para reportes (queries pesadas)
 * Sprint 2.4.2: Throttling para endpoints que hacen queries costosas
 */
export const reportLimiter = createApiLimiter({
    windowMs: 60 * 1000, // 1 minuto
    maxPerUser: 10, // Máximo 10 reportes por minuto
    maxPerAdmin: 30,
    name: 'reports'
});

/**
 * Rate Limiter para búsquedas
 * Sprint 2.4.2: Prevenir abuse de endpoints de búsqueda
 */
export const searchLimiter = createApiLimiter({
    windowMs: 60 * 1000,
    maxPerUser: 20,
    maxPerAdmin: 60,
    name: 'search'
});

/**
 * Rate Limiter para AI endpoints (costosos)
 * Sprint 2.4.2: Límite bajo para endpoints de AI que consumen OpenAI API
 */
export const aiLimiter = createApiLimiter({
    windowMs: 60 * 1000,
    maxPerUser: 5, // Solo 5 requests de AI por minuto
    maxPerAdmin: 15,
    name: 'ai'
});

/**
 * Middleware para obtener estadísticas de rate limiting
 * Sprint 2.4.3: Monitoreo de rate limits
 */
export const getRateLimitStats = async (req, res) => {
    try {
        const userId = req.session?.usuario?.id;
        const ip = req.ip;

        // Obtener todas las keys de rate limit del usuario/IP actual
        const userPattern = userId ? `rate:*:ratelimit:user:${userId}` : `rate:*:ratelimit:ip:${ip}`;
        const keys = await redisClient.keys(userPattern);

        const stats = {};

        for (const key of keys) {
            const ttl = await redisClient.ttl(key);
            const count = await redisClient.get(key);

            const limitType = key.split(':')[1]; // Extraer tipo de límite

            stats[limitType] = {
                current: parseInt(count) || 0,
                ttl: ttl > 0 ? ttl : 0,
                resetAt: ttl > 0 ? new Date(Date.now() + ttl * 1000).toISOString() : null
            };
        }

        res.json({
            success: true,
            userId: userId || 'anonymous',
            ip,
            limits: stats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error getting rate limit stats', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            success: false,
            error: 'Error obteniendo estadísticas de rate limiting'
        });
    }
};

export default {
    advancedGeneralLimiter,
    advancedLoginLimiter,
    advancedCreateResourceLimiter,
    advancedUploadLimiter,
    createApiLimiter,
    reportLimiter,
    searchLimiter,
    aiLimiter,
    getRateLimitStats
};
