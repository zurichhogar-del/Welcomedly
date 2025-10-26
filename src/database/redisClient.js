/**
 * Cliente Redis para cache y gestión de métricas en tiempo real
 */
import Redis from 'ioredis';
import dotenv from 'dotenv';
import logger from '../utils/logger.js';

dotenv.config();

// Configuración del cliente Redis
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB) || 0,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false
};

// Crear cliente Redis
const redisClient = new Redis(redisConfig);

// Event handlers
redisClient.on('connect', () => {
    logger.info('Redis: Conectando...');
});

redisClient.on('ready', () => {
    logger.info('Redis: Cliente listo y conectado');
});

redisClient.on('error', (err) => {
    logger.error('Redis Error', { error: err.message, stack: err.stack });
});

redisClient.on('close', () => {
    logger.warn('Redis: Conexión cerrada');
});

redisClient.on('reconnecting', () => {
    logger.info('Redis: Reconectando...');
});

// Función helper para verificar conectividad
export async function testRedisConnection() {
    try {
        const pong = await redisClient.ping();
        logger.info('Redis PING test', { response: pong });
        return true;
    } catch (error) {
        logger.error('Redis connection test failed', { error: error.message, stack: error.stack });
        return false;
    }
}

// Funciones helper para métricas de agentes
export const AgentMetricsCache = {
    /**
     * Inicializar métricas del día para un agente
     */
    async initDailyMetrics(agentId) {
        const key = `agent:${agentId}:metrics:today`;
        const exists = await redisClient.exists(key);

        if (!exists) {
            await redisClient.hmset(key, {
                productiveTime: 0,
                pauseTime: 0,
                callTime: 0,
                afterCallWorkTime: 0,
                calls: 0,
                sales: 0,
                lastUpdate: Date.now()
            });

            // Expira a las 23:59:59 del día actual
            const now = new Date();
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            const ttl = Math.floor((endOfDay - now) / 1000);
            await redisClient.expire(key, ttl);
        }

        return key;
    },

    /**
     * Obtener métricas actuales de un agente
     */
    async getMetrics(agentId) {
        const key = `agent:${agentId}:metrics:today`;
        const metrics = await redisClient.hgetall(key);

        return {
            productiveTime: parseInt(metrics.productiveTime) || 0,
            pauseTime: parseInt(metrics.pauseTime) || 0,
            callTime: parseInt(metrics.callTime) || 0,
            afterCallWorkTime: parseInt(metrics.afterCallWorkTime) || 0,
            calls: parseInt(metrics.calls) || 0,
            sales: parseInt(metrics.sales) || 0,
            lastUpdate: parseInt(metrics.lastUpdate) || Date.now()
        };
    },

    /**
     * Incrementar tiempo productivo
     */
    async incrementProductiveTime(agentId, seconds) {
        const key = `agent:${agentId}:metrics:today`;
        await redisClient.hincrby(key, 'productiveTime', seconds);
        await redisClient.hset(key, 'lastUpdate', Date.now());
    },

    /**
     * Incrementar tiempo en pausa
     */
    async incrementPauseTime(agentId, seconds) {
        const key = `agent:${agentId}:metrics:today`;
        await redisClient.hincrby(key, 'pauseTime', seconds);
        await redisClient.hset(key, 'lastUpdate', Date.now());
    },

    /**
     * Incrementar tiempo en llamada
     */
    async incrementCallTime(agentId, seconds) {
        const key = `agent:${agentId}:metrics:today`;
        await redisClient.hincrby(key, 'callTime', seconds);
        await redisClient.hset(key, 'lastUpdate', Date.now());
    },

    /**
     * Incrementar contador de llamadas
     */
    async incrementCalls(agentId) {
        const key = `agent:${agentId}:metrics:today`;
        await redisClient.hincrby(key, 'calls', 1);
        await redisClient.hset(key, 'lastUpdate', Date.now());
    },

    /**
     * Incrementar contador de ventas
     */
    async incrementSales(agentId) {
        const key = `agent:${agentId}:metrics:today`;
        await redisClient.hincrby(key, 'sales', 1);
        await redisClient.hset(key, 'lastUpdate', Date.now());
    }
};

// Funciones helper para estado de agentes
export const AgentStateCache = {
    /**
     * Establecer estado actual del agente
     */
    async setState(agentId, status) {
        const key = `agent:${agentId}:state`;
        await redisClient.hmset(key, {
            status,
            since: Date.now()
        });
        await redisClient.expire(key, 86400); // 24 horas
    },

    /**
     * Obtener estado actual del agente
     */
    async getState(agentId) {
        const key = `agent:${agentId}:state`;
        const state = await redisClient.hgetall(key);

        if (!state || !state.status) {
            return null;
        }

        return {
            status: state.status,
            since: parseInt(state.since),
            duration: Math.floor((Date.now() - parseInt(state.since)) / 1000)
        };
    },

    /**
     * Eliminar estado del agente
     */
    async deleteState(agentId) {
        const key = `agent:${agentId}:state`;
        await redisClient.del(key);
    }
};

/**
 * Sprint 2.1: Cache Helper Genérico para Queries Frecuentes
 * Patrón Cache-Aside: Intenta obtener de cache, si no existe, ejecuta la función y cachea el resultado
 */
export const CacheHelper = {
    /**
     * Obtener desde cache o ejecutar función si no existe
     * @param {string} key - Clave del cache
     * @param {Function} fetchFunction - Función que obtiene los datos (async)
     * @param {number} ttl - Tiempo de vida en segundos (default: 300 = 5 minutos)
     * @returns {Promise<any>} Datos del cache o resultado de fetchFunction
     */
    async getOrSet(key, fetchFunction, ttl = 300) {
        try {
            // Intentar obtener desde cache
            const cached = await redisClient.get(key);

            if (cached) {
                logger.debug('Cache HIT', { key });
                return JSON.parse(cached);
            }

            // Cache MISS - Ejecutar función para obtener datos
            logger.debug('Cache MISS', { key });
            const data = await fetchFunction();

            // Guardar en cache con TTL
            await redisClient.setEx(key, ttl, JSON.stringify(data));

            return data;
        } catch (error) {
            logger.error('Error en CacheHelper.getOrSet', {
                error: error.message,
                key,
                stack: error.stack
            });
            // Si hay error en cache, ejecutar función directamente
            return await fetchFunction();
        }
    },

    /**
     * Invalidar cache por clave
     * @param {string} key - Clave del cache a invalidar
     */
    async invalidate(key) {
        try {
            await redisClient.del(key);
            logger.debug('Cache invalidado', { key });
        } catch (error) {
            logger.error('Error invalidando cache', {
                error: error.message,
                key,
                stack: error.stack
            });
        }
    },

    /**
     * Invalidar cache por patrón
     * @param {string} pattern - Patrón de claves (ej: 'disposiciones:*')
     */
    async invalidatePattern(pattern) {
        try {
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(keys);
                logger.debug('Cache pattern invalidado', { pattern, keysDeleted: keys.length });
            }
        } catch (error) {
            logger.error('Error invalidando cache pattern', {
                error: error.message,
                pattern,
                stack: error.stack
            });
        }
    },

    /**
     * Establecer valor en cache
     * @param {string} key - Clave del cache
     * @param {any} value - Valor a cachear
     * @param {number} ttl - Tiempo de vida en segundos
     */
    async set(key, value, ttl = 300) {
        try {
            await redisClient.setEx(key, ttl, JSON.stringify(value));
            logger.debug('Cache SET', { key, ttl });
        } catch (error) {
            logger.error('Error en CacheHelper.set', {
                error: error.message,
                key,
                stack: error.stack
            });
        }
    },

    /**
     * Obtener valor desde cache
     * @param {string} key - Clave del cache
     * @returns {Promise<any|null>} Valor del cache o null si no existe
     */
    async get(key) {
        try {
            const cached = await redisClient.get(key);
            if (cached) {
                logger.debug('Cache GET HIT', { key });
                return JSON.parse(cached);
            }
            logger.debug('Cache GET MISS', { key });
            return null;
        } catch (error) {
            logger.error('Error en CacheHelper.get', {
                error: error.message,
                key,
                stack: error.stack
            });
            return null;
        }
    }
};

export default redisClient;
