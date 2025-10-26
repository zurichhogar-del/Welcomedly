/**
 * Health Check Routes - Sprint 2.3
 * Endpoints para monitoreo de salud del sistema
 */

import express from 'express';
import db from '../models/index.js';
import redisClient from '../database/redisClient.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Health check endpoint
 * Verifica el estado de todos los componentes críticos del sistema
 */
router.get('/health', async (req, res) => {
    const startTime = Date.now();

    const health = {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date(),
        checks: {},
        responseTime: 0
    };

    // Check PostgreSQL Database
    try {
        await db.sequelize.authenticate();
        health.checks.database = {
            status: 'healthy',
            type: 'PostgreSQL',
            message: 'Database connection successful'
        };
        logger.debug('Health check: Database healthy');
    } catch (error) {
        health.checks.database = {
            status: 'unhealthy',
            type: 'PostgreSQL',
            message: error.message
        };
        health.status = 'degraded';
        logger.error('Health check: Database unhealthy', { error: error.message });
    }

    // Check Redis
    try {
        await redisClient.ping();
        health.checks.redis = {
            status: 'healthy',
            type: 'Redis',
            message: 'Redis connection successful'
        };
        logger.debug('Health check: Redis healthy');
    } catch (error) {
        health.checks.redis = {
            status: 'unhealthy',
            type: 'Redis',
            message: error.message
        };
        health.status = 'degraded';
        logger.error('Health check: Redis unhealthy', { error: error.message });
    }

    // Check WebSocket
    if (global.io && global.io.engine) {
        health.checks.websocket = {
            status: 'healthy',
            type: 'Socket.IO',
            message: 'WebSocket server active',
            connections: global.io.engine.clientsCount || 0
        };
        logger.debug('Health check: WebSocket healthy', {
            connections: global.io.engine.clientsCount
        });
    } else {
        health.checks.websocket = {
            status: 'unhealthy',
            type: 'Socket.IO',
            message: 'WebSocket server not initialized'
        };
        health.status = 'degraded';
        logger.warn('Health check: WebSocket unhealthy');
    }

    // Check Memory Usage
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
    };

    health.checks.memory = {
        status: memoryUsageMB.heapUsed < 500 ? 'healthy' : 'warning',
        usage: memoryUsageMB,
        unit: 'MB'
    };

    // Response time
    health.responseTime = Date.now() - startTime;

    // Determine HTTP status code
    const statusCode = health.status === 'degraded' ? 503 : 200;

    // Log health check result
    logger.info('Health check completed', {
        status: health.status,
        responseTime: health.responseTime,
        checks: Object.keys(health.checks).reduce((acc, key) => {
            acc[key] = health.checks[key].status;
            return acc;
        }, {})
    });

    res.status(statusCode).json(health);
});

/**
 * Readiness probe
 * Indica si el servicio está listo para recibir tráfico
 */
router.get('/ready', async (req, res) => {
    try {
        await db.sequelize.authenticate();
        await redisClient.ping();

        res.status(200).json({
            ready: true,
            timestamp: new Date()
        });
    } catch (error) {
        logger.error('Readiness check failed', { error: error.message });
        res.status(503).json({
            ready: false,
            error: error.message,
            timestamp: new Date()
        });
    }
});

/**
 * Liveness probe
 * Indica si el servicio está vivo y funcionando
 */
router.get('/live', (req, res) => {
    res.status(200).json({
        alive: true,
        uptime: process.uptime(),
        timestamp: new Date()
    });
});

export default router;
