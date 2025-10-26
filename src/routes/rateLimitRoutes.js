/**
 * Rate Limit Monitoring Routes - Sprint 2.4.3
 * Endpoints para monitorear y gestionar rate limits
 */

import { Router } from 'express';
import { getRateLimitStats } from '../middlewares/advancedRateLimiting.js';
import redisClient from '../database/redisClient.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * GET /api/ratelimit/stats
 * Obtener estadísticas de rate limiting del usuario actual
 * Sprint 2.4.3: Monitoreo de límites
 */
router.get('/stats', getRateLimitStats);

/**
 * GET /api/ratelimit/global-stats
 * Obtener estadísticas globales de rate limiting (solo ADMIN)
 * Sprint 2.4.3: Dashboard de monitoreo
 */
router.get('/global-stats', async (req, res) => {
    try {
        // Verificar que sea admin
        if (req.session?.usuario?.rol !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                error: 'Solo administradores pueden ver estadísticas globales'
            });
        }

        // Obtener todas las keys de rate limit
        const allKeys = await redisClient.keys('rate:*');

        const stats = {
            total: {
                users: 0,
                ips: 0,
                limitTypes: {}
            },
            topUsers: [],
            topIps: [],
            timestamp: new Date().toISOString()
        };

        // Agrupar por tipo de límite
        for (const key of allKeys) {
            const parts = key.split(':');
            const limitType = parts[1]; // general, login, create, etc.
            const identifierType = parts[2].split(':')[0]; // ratelimit
            const userOrIp = parts[2].split(':')[1]; // user o ip

            if (!stats.total.limitTypes[limitType]) {
                stats.total.limitTypes[limitType] = 0;
            }
            stats.total.limitTypes[limitType]++;

            if (userOrIp === 'user') {
                stats.total.users++;
            } else if (userOrIp === 'ip') {
                stats.total.ips++;
            }
        }

        res.json({
            success: true,
            stats,
            totalKeys: allKeys.length
        });

    } catch (error) {
        logger.error('Error getting global rate limit stats', {
            error: error.message,
            stack: error.stack
        });

        res.status(500).json({
            success: false,
            error: 'Error obteniendo estadísticas globales'
        });
    }
});

/**
 * DELETE /api/ratelimit/reset/:userId
 * Resetear rate limits de un usuario específico (solo ADMIN)
 * Sprint 2.4.3: Gestión de límites
 */
router.delete('/reset/:userId', async (req, res) => {
    try {
        // Verificar que sea admin
        if (req.session?.usuario?.rol !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                error: 'Solo administradores pueden resetear rate limits'
            });
        }

        const { userId } = req.params;

        // Buscar y eliminar todas las keys del usuario
        const userPattern = `rate:*:ratelimit:user:${userId}`;
        const keys = await redisClient.keys(userPattern);

        if (keys.length === 0) {
            return res.json({
                success: true,
                message: 'No se encontraron límites activos para este usuario',
                deleted: 0
            });
        }

        // Eliminar todas las keys
        await redisClient.del(...keys);

        logger.info('Rate limits reset by admin', {
            adminId: req.session.usuario.id,
            targetUserId: userId,
            deletedKeys: keys.length
        });

        res.json({
            success: true,
            message: `Rate limits reseteados para usuario ${userId}`,
            deleted: keys.length
        });

    } catch (error) {
        logger.error('Error resetting rate limits', {
            error: error.message,
            stack: error.stack,
            userId: req.params.userId
        });

        res.status(500).json({
            success: false,
            error: 'Error al resetear rate limits'
        });
    }
});

/**
 * GET /api/ratelimit/health
 * Verificar salud del sistema de rate limiting
 * Sprint 2.4.3: Health check
 */
router.get('/health', async (req, res) => {
    try {
        // Verificar conexión a Redis
        const redisPing = await redisClient.ping();

        // Contar keys de rate limiting
        const rateLimitKeys = await redisClient.keys('rate:*');

        res.json({
            success: true,
            redis: redisPing === 'PONG' ? 'connected' : 'disconnected',
            activeRateLimits: rateLimitKeys.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error checking rate limit health', {
            error: error.message
        });

        res.status(503).json({
            success: false,
            redis: 'error',
            error: error.message
        });
    }
});

export default router;
