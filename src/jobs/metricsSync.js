/**
 * Job de Sincronización de Métricas - Sprint 1.2
 * Sincroniza métricas de Redis a PostgreSQL cada 60 segundos
 */

import db from '../models/index.js';
import { AgentMetricsCache } from '../database/redisClient.js';
import logger from '../utils/logger.js';

const { WorkSession, User } = db;

class MetricsSyncJob {
    constructor() {
        this.intervalId = null;
        this.isRunning = false;
        this.syncInterval = 60000; // 60 segundos
    }

    /**
     * Iniciar el job de sincronización
     */
    start() {
        if (this.intervalId) {
            logger.warn('Metrics Sync Job: Ya está ejecutándose');
            return;
        }

        logger.info('Metrics Sync Job: Iniciando sincronización automática', {
            intervalSeconds: this.syncInterval / 1000
        });

        // Ejecutar inmediatamente la primera vez
        this.syncAllAgentMetrics();

        // Luego ejecutar cada 60 segundos
        this.intervalId = setInterval(() => {
            this.syncAllAgentMetrics();
        }, this.syncInterval);
    }

    /**
     * Detener el job de sincronización
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            logger.info('Metrics Sync Job: Detenido');
        }
    }

    /**
     * Sincronizar métricas de todos los agentes activos
     */
    async syncAllAgentMetrics() {
        // Evitar ejecución concurrente
        if (this.isRunning) {
            logger.debug('Metrics Sync Job: Sincronización anterior aún en progreso, saltando');
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();

        try {
            // Obtener sesiones activas (agentes que están logged in)
            const activeSessions = await WorkSession.findAll({
                where: {
                    isActive: true
                },
                include: [{
                    model: User,
                    as: 'agent',
                    attributes: ['id', 'nombre']
                }]
            });

            if (activeSessions.length === 0) {
                logger.debug('Metrics Sync Job: No hay sesiones activas para sincronizar');
                this.isRunning = false;
                return;
            }

            logger.debug('Metrics Sync Job: Sincronizando métricas', {
                activeSessions: activeSessions.length
            });

            let successCount = 0;
            let failCount = 0;

            // Sincronizar cada sesión activa
            for (const session of activeSessions) {
                try {
                    await this.syncAgentMetrics(session);
                    successCount++;
                } catch (error) {
                    failCount++;
                    logger.error('Metrics Sync Job: Error sincronizando agente', {
                        agentId: session.agentId,
                        sessionId: session.id,
                        error: error.message,
                        stack: error.stack
                    });
                }
            }

            const duration = Date.now() - startTime;

            logger.info('Metrics Sync Job: Sincronización completada', {
                totalSessions: activeSessions.length,
                successful: successCount,
                failed: failCount,
                durationMs: duration
            });

        } catch (error) {
            logger.error('Metrics Sync Job: Error fatal en sincronización', {
                error: error.message,
                stack: error.stack
            });
        } finally {
            this.isRunning = false;
        }
    }

    /**
     * Sincronizar métricas de un agente específico
     */
    async syncAgentMetrics(session) {
        const agentId = session.agentId;

        // Obtener métricas de Redis
        const metrics = await AgentMetricsCache.getMetrics(agentId);

        // Actualizar WorkSession en PostgreSQL
        await session.update({
            productiveTime: metrics.productiveTime || 0,
            pauseTime: metrics.pauseTime || 0,
            callTime: metrics.callTime || 0,
            afterCallWorkTime: metrics.afterCallWorkTime || 0,
            callsHandled: metrics.calls || 0,
            salesCount: metrics.sales || 0
        });

        logger.debug('Metrics Sync Job: Agente sincronizado', {
            agentId,
            sessionId: session.id,
            metrics: {
                productiveTime: metrics.productiveTime,
                pauseTime: metrics.pauseTime,
                callTime: metrics.callTime,
                calls: metrics.calls,
                sales: metrics.sales
            }
        });
    }

    /**
     * Sincronizar métricas de un agente específico manualmente
     * (útil para cuando el agente hace logout)
     */
    async syncAgentMetricsManually(agentId) {
        try {
            // Buscar sesión activa del agente
            const activeSession = await WorkSession.findOne({
                where: {
                    agentId,
                    isActive: true
                }
            });

            if (!activeSession) {
                logger.warn('Metrics Sync Job: No hay sesión activa para el agente', { agentId });
                return null;
            }

            // Sincronizar métricas
            await this.syncAgentMetrics(activeSession);

            logger.info('Metrics Sync Job: Sincronización manual completada', { agentId });

            return activeSession;

        } catch (error) {
            logger.error('Metrics Sync Job: Error en sincronización manual', {
                agentId,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Obtener estadísticas del job
     */
    getStats() {
        return {
            isRunning: !!this.intervalId,
            syncInterval: this.syncInterval,
            currentlyProcessing: this.isRunning
        };
    }
}

// Exportar instancia única (singleton)
const metricsSyncJob = new MetricsSyncJob();

export default metricsSyncJob;
