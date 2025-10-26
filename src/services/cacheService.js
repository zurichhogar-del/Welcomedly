/**
 * Cache Service - Sprint 2.3.1
 * Servicio de caché Redis para optimizar queries frecuentes
 */

import redisClient from '../database/redisClient.js';
import logger from '../utils/logger.js';

class CacheService {
    constructor() {
        // TTL por defecto: 5 minutos
        this.defaultTTL = 300;

        // Prefijos para diferentes tipos de caché
        this.prefixes = {
            campaign: 'cache:campaign:',
            user: 'cache:user:',
            dispositions: 'cache:dispositions:',
            reports: 'cache:reports:',
            metrics: 'cache:metrics:'
        };
    }

    /**
     * Obtiene un valor del caché
     * @param {string} key - Clave del caché
     * @returns {Promise<any|null>} - Valor parseado o null si no existe
     */
    async get(key) {
        try {
            const value = await redisClient.get(key);

            if (!value) {
                logger.debug('Cache miss', { key });
                return null;
            }

            logger.debug('Cache hit', { key });
            return JSON.parse(value);
        } catch (error) {
            logger.error('Error obteniendo del caché', {
                error: error.message,
                stack: error.stack,
                key
            });
            return null;
        }
    }

    /**
     * Guarda un valor en el caché
     * @param {string} key - Clave del caché
     * @param {any} value - Valor a guardar (será serializado a JSON)
     * @param {number} ttl - Tiempo de vida en segundos (opcional)
     * @returns {Promise<boolean>} - True si se guardó exitosamente
     */
    async set(key, value, ttl = this.defaultTTL) {
        try {
            const serialized = JSON.stringify(value);
            await redisClient.setex(key, ttl, serialized);

            logger.debug('Cache set', { key, ttl });
            return true;
        } catch (error) {
            logger.error('Error guardando en caché', {
                error: error.message,
                stack: error.stack,
                key
            });
            return false;
        }
    }

    /**
     * Elimina una clave del caché
     * @param {string} key - Clave a eliminar
     * @returns {Promise<boolean>}
     */
    async del(key) {
        try {
            await redisClient.del(key);
            logger.debug('Cache deleted', { key });
            return true;
        } catch (error) {
            logger.error('Error eliminando del caché', {
                error: error.message,
                stack: error.stack,
                key
            });
            return false;
        }
    }

    /**
     * Elimina múltiples claves que coincidan con un patrón
     * @param {string} pattern - Patrón de búsqueda (ej: 'cache:campaign:*')
     * @returns {Promise<number>} - Número de claves eliminadas
     */
    async delPattern(pattern) {
        try {
            const keys = await redisClient.keys(pattern);

            if (keys.length === 0) {
                return 0;
            }

            await redisClient.del(...keys);
            logger.info('Cache pattern deleted', { pattern, count: keys.length });
            return keys.length;
        } catch (error) {
            logger.error('Error eliminando patrón del caché', {
                error: error.message,
                stack: error.stack,
                pattern
            });
            return 0;
        }
    }

    /**
     * Wrapper para cachear el resultado de una función
     * @param {string} key - Clave del caché
     * @param {Function} fn - Función async que retorna los datos
     * @param {number} ttl - TTL en segundos
     * @returns {Promise<any>}
     */
    async wrap(key, fn, ttl = this.defaultTTL) {
        try {
            // Intentar obtener del caché
            const cached = await this.get(key);

            if (cached !== null) {
                return cached;
            }

            // Si no está en caché, ejecutar la función
            logger.debug('Cache wrap: executing function', { key });
            const result = await fn();

            // Guardar en caché
            await this.set(key, result, ttl);

            return result;
        } catch (error) {
            logger.error('Error en cache wrap', {
                error: error.message,
                stack: error.stack,
                key
            });

            // Si hay error, ejecutar la función sin caché
            return await fn();
        }
    }

    /**
     * Obtiene todas las campañas activas (con caché)
     */
    getCampaignsKey() {
        return `${this.prefixes.campaign}all:active`;
    }

    /**
     * Obtiene clave para campaña específica
     */
    getCampaignKey(campaignId) {
        return `${this.prefixes.campaign}${campaignId}`;
    }

    /**
     * Obtiene clave para usuario específico
     */
    getUserKey(userId) {
        return `${this.prefixes.user}${userId}`;
    }

    /**
     * Obtiene clave para disposiciones
     */
    getDispositionsKey() {
        return `${this.prefixes.dispositions}all`;
    }

    /**
     * Obtiene clave para métricas de agente
     */
    getAgentMetricsKey(agentId, period = 'today') {
        return `${this.prefixes.metrics}agent:${agentId}:${period}`;
    }

    /**
     * Obtiene clave para reporte
     */
    getReportKey(reportType, params = {}) {
        const paramsStr = Object.keys(params)
            .sort()
            .map(k => `${k}=${params[k]}`)
            .join(':');
        return `${this.prefixes.reports}${reportType}:${paramsStr}`;
    }

    /**
     * Invalida caché relacionado con una campaña
     */
    async invalidateCampaign(campaignId) {
        const patterns = [
            `${this.prefixes.campaign}${campaignId}*`,
            `${this.prefixes.campaign}all*`,
            `${this.prefixes.reports}campaign*`
        ];

        let total = 0;
        for (const pattern of patterns) {
            total += await this.delPattern(pattern);
        }

        logger.info('Campaign cache invalidated', { campaignId, deletedKeys: total });
        return total;
    }

    /**
     * Invalida caché relacionado con un usuario
     */
    async invalidateUser(userId) {
        const patterns = [
            `${this.prefixes.user}${userId}*`,
            `${this.prefixes.metrics}agent:${userId}*`
        ];

        let total = 0;
        for (const pattern of patterns) {
            total += await this.delPattern(pattern);
        }

        logger.info('User cache invalidated', { userId, deletedKeys: total });
        return total;
    }

    /**
     * Invalida todo el caché de disposiciones
     */
    async invalidateDispositions() {
        const deleted = await this.delPattern(`${this.prefixes.dispositions}*`);
        logger.info('Dispositions cache invalidated', { deletedKeys: deleted });
        return deleted;
    }

    /**
     * Obtiene estadísticas del caché
     */
    async getStats() {
        try {
            const info = await redisClient.info('stats');
            const keyspace = await redisClient.info('keyspace');

            // Contar keys por prefijo
            const prefixCounts = {};
            for (const [name, prefix] of Object.entries(this.prefixes)) {
                const keys = await redisClient.keys(`${prefix}*`);
                prefixCounts[name] = keys.length;
            }

            return {
                info,
                keyspace,
                prefixCounts,
                timestamp: new Date()
            };
        } catch (error) {
            logger.error('Error obteniendo stats del caché', {
                error: error.message,
                stack: error.stack
            });
            return null;
        }
    }
}

export default new CacheService();
