import db from '../models/index.js';
import redisClient, { AgentMetricsCache, AgentStateCache } from '../database/redisClient.js';
import logger from '../utils/logger.js';

const { AgentStatus, PauseHistory, WorkSession, User, sequelize } = db;

/**
 * Servicio para gestionar estados y tracking de agentes
 */
class AgentStatusService {
    constructor() {
        this.validTransitions = {
            offline: ['available', 'training', 'meeting'],
            available: ['in_call', 'on_pause', 'training', 'meeting', 'offline'],
            in_call: ['available', 'after_call_work', 'on_pause', 'offline'], // Permitir pausa de emergencia
            after_call_work: ['available', 'on_pause', 'offline'],
            on_pause: ['available', 'offline'],
            training: ['available', 'on_pause', 'offline'], // Permitir pausa desde training
            meeting: ['available', 'on_pause', 'offline']  // Permitir pausa desde meeting
        };

        this.pauseDurationLimits = {
            bathroom: 600,      // 10 minutos
            break: 900,         // 15 minutos
            personal: 1800,     // 30 minutos
            coaching: 3600,      // 1 hora
            system_issue: 7200,   // 2 horas
            lunch: 3600          // 1 hora
        };
    }

    /**
     * Cambia el estado de un agente
     * Sprint 2.3: Con logging estructurado
     */
    async changeAgentStatus(agentId, newStatus, reason = '', metadata = {}) {
        // Sprint 2.3: Log inicio de operación
        logger.info('Agent status change initiated', {
            agentId,
            newStatus,
            reason,
            metadata: {
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent
            }
        });

        try {
            // Validar que el agente existe
            const agent = await User.findByPk(agentId);
            if (!agent) {
                logger.warn('Agent not found', { agentId });
                throw new Error('Agente no encontrado');
            }

            // Obtener estado actual (de Redis y base de datos)
            const currentStatus = await AgentStatus.getCurrentStatus(agentId);
            const currentRedisState = await AgentStateCache.getState(agentId);

            // Sprint 2.3: Log estado actual
            logger.debug('Current agent state retrieved', {
                agentId,
                currentStatus: currentStatus?.status || 'none',
                redisState: currentRedisState?.status || 'none'
            });

            // Validar transición (permitir mismo estado para re-confirmación)
            if (currentStatus && currentStatus.status !== newStatus && !this.isValidTransition(currentStatus.status, newStatus)) {
                logger.error('Invalid status transition', {
                    agentId,
                    from: currentStatus.status,
                    to: newStatus
                });
                throw new Error(`Transición inválida: de ${currentStatus.status} a ${newStatus}`);
            }

            // Si es el mismo estado, solo actualizar el timestamp pero no crear nuevo registro
            if (currentStatus && currentStatus.status === newStatus) {
                logger.debug(`Agente ${agentId}: Re-confirmación de estado ${newStatus} (no se crea nuevo registro)`);
                return currentStatus;
            }

            // ===== ACTUALIZAR MÉTRICAS EN REDIS ANTES DE CAMBIAR ESTADO =====
            if (currentRedisState && currentRedisState.status) {
                const elapsedSeconds = currentRedisState.duration || 0;

                // Inicializar métricas del día si no existen
                await AgentMetricsCache.initDailyMetrics(agentId);

                // Incrementar el contador correspondiente al estado anterior
                switch (currentRedisState.status) {
                    case 'available':
                    case 'after_call_work':
                    case 'training':
                    case 'meeting':
                        // Tiempo productivo (disponible + ACW + entrenamiento + reunión)
                        await AgentMetricsCache.incrementProductiveTime(agentId, elapsedSeconds);
                        logger.debug(`Agente ${agentId}: +${elapsedSeconds}s tiempo productivo`);
                        break;

                    case 'in_call':
                        // Tiempo en llamada (también cuenta como productivo)
                        await AgentMetricsCache.incrementCallTime(agentId, elapsedSeconds);
                        await AgentMetricsCache.incrementProductiveTime(agentId, elapsedSeconds);
                        logger.debug(`Agente ${agentId}: +${elapsedSeconds}s tiempo en llamada`);
                        break;

                    case 'on_pause':
                        // Tiempo en pausa
                        await AgentMetricsCache.incrementPauseTime(agentId, elapsedSeconds);
                        logger.debug(`Agente ${agentId}: +${elapsedSeconds}s tiempo en pausa`);
                        break;
                }
            }

            // Finalizar estado anterior si existe
            if (currentStatus && currentStatus.isActive) {
                await currentStatus.endStatus();
            }

            // Crear nuevo estado en base de datos
            const agentStatus = await AgentStatus.create({
                agentId,
                status: newStatus,
                previousStatus: currentStatus?.status || 'offline',
                reason,
                metadata,
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent
            });

            // ===== ACTUALIZAR ESTADO EN REDIS =====
            await AgentStateCache.setState(agentId, newStatus);
            logger.info(`Agente ${agentId}: Estado cambiado a ${newStatus}`);

            // Incrementar contadores específicos
            if (newStatus === 'in_call') {
                await AgentMetricsCache.incrementCalls(agentId);
                logger.debug(`Agente ${agentId}: +1 llamada`);
            }

            // Manejar lógica específica según el estado
            await this.handleStatusChange(agentId, newStatus, reason, metadata);

            // Emitir evento para WebSocket con métricas actualizadas
            if (global.io) {
                const currentMetrics = await AgentMetricsCache.getMetrics(agentId);

                global.io.emit('agent:status:change', {
                    agentId,
                    agentName: agent.nombre,
                    previousStatus: currentStatus?.status || 'offline',
                    newStatus,
                    timestamp: new Date(),
                    metadata,
                    metrics: currentMetrics
                });
            }

            // Sprint 2.3: Log éxito de operación
            logger.info('Agent status change successful', {
                agentId,
                previousStatus: currentStatus?.status || 'offline',
                newStatus,
                timestamp: new Date()
            });

            return agentStatus;
        } catch (error) {
            // Sprint 2.3: Log error con contexto completo
            logger.error('Agent status change failed', {
                agentId,
                newStatus,
                reason,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Inicia una pausa para un agente
     * Sprint 2.3: Con logging estructurado
     */
    async startPause(agentId, pauseType, reason = '', metadata = {}) {
        // Sprint 2.3: Log inicio de pausa
        logger.info('Agent pause start initiated', {
            agentId,
            pauseType,
            reason
        });

        try {
            // Validar que el agente no esté ya en pausa
            const activePause = await PauseHistory.getActivePause(agentId);
            if (activePause) {
                logger.warn('Agent already in pause', { agentId, existingPauseId: activePause.id });
                throw new Error('El agente ya está en pausa');
            }

            // Validar tipo de pausa
            const validTypes = ['bathroom', 'lunch', 'break', 'coaching', 'system_issue', 'personal'];
            if (!validTypes.includes(pauseType)) {
                logger.error('Invalid pause type', { agentId, pauseType });
                throw new Error('Tipo de pausa inválido');
            }

            // Cambiar estado a on_pause
            await this.changeAgentStatus(agentId, 'on_pause', `Pausa: ${pauseType}`, metadata);

            // Crear registro de pausa
            const pause = await PauseHistory.create({
                agentId,
                pauseType,
                reason,
                supervisorApproved: pauseType === 'lunch' || pauseType === 'training',
                ipAddress: metadata.ipAddress,
                metadata
            });

            // Programar alerta si excede tiempo límite
            const durationLimit = this.pauseDurationLimits[pauseType];
            if (durationLimit) {
                setTimeout(() => {
                    this.checkPauseDuration(pause.id, durationLimit);
                }, durationLimit * 1000);
            }

            // Emitir evento de pausa iniciada
            if (global.io) {
                global.io.emit('agent:pause:start', {
                    agentId,
                    pauseId: pause.id,
                    pauseType,
                    startTime: pause.startTime,
                    estimatedDuration: durationLimit
                });
            }

            // Sprint 2.3: Log éxito
            logger.info('Agent pause started successfully', {
                agentId,
                pauseId: pause.id,
                pauseType,
                durationLimit,
                timestamp: new Date()
            });

            return pause;
        } catch (error) {
            // Sprint 2.3: Log error con contexto
            logger.error('Agent pause start failed', {
                agentId,
                pauseType,
                reason,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Finaliza una pausa
     */
    async endPause(agentId) {
        try {
            // Obtener pausa activa
            const activePause = await PauseHistory.getActivePause(agentId);
            if (!activePause) {
                throw new Error('No hay pausa activa');
            }

            // Finalizar pausa
            await activePause.endPause();

            // Cambiar estado a available
            await this.changeAgentStatus(agentId, 'available', 'Fin de pausa');

            // Emitir evento de pausa finalizada
            if (global.io) {
                global.io.emit('agent:pause:end', {
                    agentId,
                    pauseId: activePause.id,
                    endTime: activePause.endTime,
                    duration: activePause.duration
                });
            }

            return activePause;
        } catch (error) {
            logger.error('Error en endPause', { error: error.message, stack: error.stack, agentId });
            throw error;
        }
    }

    /**
     * Inicia sesión de trabajo
     */
    async startWorkSession(agentId, metadata = {}) {
        try {
            // Verificar si ya hay sesión activa
            const activeSession = await WorkSession.getActiveSession(agentId);
            if (activeSession) {
                throw new Error('Ya existe una sesión activa');
            }

            // Crear nueva sesión de trabajo
            const workSession = await WorkSession.create({
                agentId,
                campaignId: metadata.campaignId,
                loginType: metadata.loginType || 'regular',
                ipAddress: metadata.ipAddress,
                userAgent: metadata.userAgent
            });

            // Cambiar estado a available
            await this.changeAgentStatus(agentId, 'available', 'Inicio de sesión', metadata);

            // Emitir evento
            if (global.io) {
                global.io.emit('agent:session:start', {
                    agentId,
                    sessionId: workSession.id,
                    loginTime: workSession.loginTime
                });
            }

            return workSession;
        } catch (error) {
            logger.error('Error en startWorkSession', { error: error.message, stack: error.stack, agentId });
            throw error;
        }
    }

    /**
     * Finaliza sesión de trabajo
     */
    async endWorkSession(agentId, endMetrics = {}) {
        try {
            // Obtener sesión activa
            const activeSession = await WorkSession.getActiveSession(agentId);
            if (!activeSession) {
                throw new Error('No hay sesión activa');
            }

            // Finalizar sesión
            await activeSession.endSession();

            // Actualizar métricas si se proporcionan
            if (Object.keys(endMetrics).length > 0) {
                await activeSession.updateMetrics(endMetrics);
            }

            // Cambiar estado a offline
            await this.changeAgentStatus(agentId, 'offline', 'Fin de sesión');

            // Emitir evento
            if (global.io) {
                global.io.emit('agent:session:end', {
                    agentId,
                    sessionId: activeSession.id,
                    logoutTime: activeSession.logoutTime,
                    totalDuration: activeSession.totalDuration,
                    metrics: endMetrics
                });
            }

            return activeSession;
        } catch (error) {
            logger.error('Error en endWorkSession', { error: error.message, stack: error.stack, agentId });
            throw error;
        }
    }

    /**
     * Obtiene métricas de agentes en tiempo real
     */
    async getRealtimeMetrics() {
        try {
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            // Agentes activos por estado
            const agentsByStatus = await AgentStatus.findAll({
                where: {
                    isActive: true
                },
                attributes: [
                    'status',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                ],
                group: ['status'],
                raw: true
            });

            // Pausas activas
            const activePauses = await PauseHistory.findAll({
                where: {
                    isActive: true
                },
                include: [{
                    model: User,
                    as: 'agent',
                    attributes: ['id', 'nombre']
                }]
            });

            // Sesiones activas
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

            return {
                timestamp: now,
                agentsByStatus: agentsByStatus.reduce((acc, item) => {
                    acc[item.status] = parseInt(item.count);
                    return acc;
                }, {}),
                activePauses: activePauses.map(pause => ({
                    agentId: pause.agentId,
                    agentName: pause.agent?.nombre,
                    pauseType: pause.pauseType,
                    duration: Math.floor((now - pause.startTime) / 1000)
                })),
                activeSessions: activeSessions.map(session => ({
                    agentId: session.agentId,
                    agentName: session.agent?.nombre,
                    loginTime: session.loginTime,
                    duration: Math.floor((now - session.loginTime) / 1000)
                }))
            };
        } catch (error) {
            logger.error('Error en getRealtimeMetrics', { error: error.message, stack: error.stack });
            throw error;
        }
    }

    /**
     * Obtiene métricas actuales del agente desde Redis (tiempo real)
     */
    async getCurrentMetrics(agentId) {
        try {
            // Inicializar métricas si no existen
            await AgentMetricsCache.initDailyMetrics(agentId);

            // Obtener métricas de Redis
            const metrics = await AgentMetricsCache.getMetrics(agentId);

            // Obtener estado actual
            const currentState = await AgentStateCache.getState(agentId);

            return {
                agentId,
                timestamp: new Date(),
                metrics: {
                    productiveTime: metrics.productiveTime,
                    pauseTime: metrics.pauseTime,
                    callTime: metrics.callTime,
                    afterCallWorkTime: metrics.afterCallWorkTime,
                    calls: metrics.calls,
                    sales: metrics.sales,
                    lastUpdate: new Date(metrics.lastUpdate)
                },
                currentState: currentState ? {
                    status: currentState.status,
                    since: new Date(currentState.since),
                    duration: currentState.duration
                } : null,
                efficiency: this.calculateEfficiencyFromMetrics(metrics)
            };
        } catch (error) {
            logger.error('Error en getCurrentMetrics', { error: error.message, stack: error.stack, agentId });
            throw error;
        }
    }

    /**
     * Obtiene métricas completas para el dashboard de supervisor
     * Incluye estado y métricas individuales de cada agente
     */
    async getSupervisorDashboardMetrics() {
        try {
            const now = new Date();

            // Obtener todos los agentes (ADMIN y AGENTE roles)
            const agents = await User.findAll({
                where: {
                    rol: ['ADMIN', 'AGENTE']
                },
                attributes: ['id', 'primerNombre', 'segundoNombre', 'primerApellido', 'segundoApellido', 'correo', 'rol']
            });

            // Obtener estados activos de todos los agentes
            const activeStatuses = await AgentStatus.findAll({
                where: {
                    isActive: true
                },
                include: [{
                    model: User,
                    as: 'agent',
                    attributes: ['id', 'primerNombre', 'primerApellido']
                }]
            });

            // Mapear estados activos por agentId
            const statusMap = activeStatuses.reduce((acc, status) => {
                acc[status.agentId] = status;
                return acc;
            }, {});

            // Obtener métricas de cada agente desde Redis
            const agentsWithMetrics = await Promise.all(
                agents.map(async (agent) => {
                    try {
                        // Inicializar métricas del agente si no existen
                        await AgentMetricsCache.initDailyMetrics(agent.id);

                        // Obtener métricas de Redis
                        const metrics = await AgentMetricsCache.getMetrics(agent.id);
                        const currentState = await AgentStateCache.getState(agent.id);
                        const activeStatus = statusMap[agent.id];

                        const efficiency = this.calculateEfficiencyFromMetrics(metrics);

                        return {
                            agentId: agent.id,
                            agentName: agent.nombre, // Usa el virtual field
                            correo: agent.correo,
                            rol: agent.rol,
                            currentStatus: currentState?.status || (activeStatus?.status) || 'offline',
                            statusSince: currentState?.since || (activeStatus?.startTime) || null,
                            statusDuration: currentState?.duration || (activeStatus ? Math.floor((now - activeStatus.startTime) / 1000) : 0),
                            metrics: {
                                productiveTime: metrics.productiveTime,
                                pauseTime: metrics.pauseTime,
                                callTime: metrics.callTime,
                                calls: metrics.calls,
                                sales: metrics.sales
                            },
                            efficiency,
                            isActive: !!activeStatus
                        };
                    } catch (error) {
                        logger.error(`Error obteniendo métricas del agente ${agent.id}`, { error: error.message, stack: error.stack, agentId: agent.id });
                        return {
                            agentId: agent.id,
                            agentName: agent.nombre,
                            correo: agent.correo,
                            rol: agent.rol,
                            currentStatus: 'offline',
                            statusSince: null,
                            statusDuration: 0,
                            metrics: {
                                productiveTime: 0,
                                pauseTime: 0,
                                callTime: 0,
                                calls: 0,
                                sales: 0
                            },
                            efficiency: 0,
                            isActive: false
                        };
                    }
                })
            );

            // Calcular resumen agregado
            const summary = {
                totalAgents: agentsWithMetrics.length,
                byStatus: agentsWithMetrics.reduce((acc, agent) => {
                    acc[agent.currentStatus] = (acc[agent.currentStatus] || 0) + 1;
                    return acc;
                }, {}),
                totalCalls: agentsWithMetrics.reduce((sum, agent) => sum + agent.metrics.calls, 0),
                avgEfficiency: Math.round(
                    agentsWithMetrics.reduce((sum, agent) => sum + agent.efficiency, 0) / agentsWithMetrics.length
                ),
                totalProductiveTime: agentsWithMetrics.reduce((sum, agent) => sum + agent.metrics.productiveTime, 0)
            };

            // Identificar alertas (agentes en pausa > 15 minutos)
            const alerts = agentsWithMetrics
                .filter(agent => agent.currentStatus === 'on_pause' && agent.statusDuration > 900)
                .map(agent => ({
                    agentId: agent.agentId,
                    agentName: agent.agentName,
                    pauseDuration: agent.statusDuration,
                    message: `${agent.agentName} en pausa por más de ${Math.floor(agent.statusDuration / 60)} minutos`
                }));

            return {
                timestamp: now,
                summary,
                agents: agentsWithMetrics,
                alerts
            };

        } catch (error) {
            logger.error('Error en getSupervisorDashboardMetrics', { error: error.message, stack: error.stack });
            throw error;
        }
    }

    /**
     * Obtiene métricas de productividad (versión mejorada con Redis)
     */
    async getAgentProductivityMetrics(agentId, period = 'today') {
        try {
            if (period === 'today') {
                // Para 'today', usar Redis que es más rápido y actualizado
                return await this.getCurrentMetrics(agentId);
            }

            // Para períodos históricos, usar base de datos
            const [statusMetrics, sessionMetrics, pauseMetrics] = await Promise.all([
                AgentStatus.getAgentMetrics(agentId, period),
                WorkSession.getProductivityReport(period).then(results =>
                    results.find(result => result.agentId === agentId)
                ),
                PauseHistory.getCurrentDayStats(agentId)
            ]);

            return {
                agentId,
                period,
                statusMetrics: statusMetrics || {},
                sessionMetrics: sessionMetrics || {},
                pauseMetrics: pauseMetrics || [],
                efficiency: this.calculateEfficiency(sessionMetrics, pauseMetrics)
            };
        } catch (error) {
            logger.error('Error en getAgentProductivityMetrics', { error: error.message, stack: error.stack, agentId, period });
            throw error;
        }
    }

    /**
     * Valida transición de estados
     */
    isValidTransition(fromStatus, toStatus) {
        return this.validTransitions[fromStatus]?.includes(toStatus) || false;
    }

    /**
     * Maneja lógica específica de cambios de estado
     */
    async handleStatusChange(agentId, status, reason, metadata) {
        switch (status) {
            case 'in_call':
                // Aquí se podría integrar con el sistema telefónico
                logger.debug(`Agente ${agentId} iniciando llamada`);
                break;
            case 'after_call_work':
                // Iniciar temporizador de ACW
                setTimeout(async () => {
                    await this.changeAgentStatus(agentId, 'available', 'ACW timeout');
                }, 180000); // 3 minutos
                break;
            case 'available':
                // Asignar siguiente llamada si hay cola
                logger.debug(`Agente ${agentId} disponible para llamadas`);
                break;
        }
    }

    /**
     * Verifica duración de pausa y envía alerta si es necesario
     */
    async checkPauseDuration(pauseId, durationLimit) {
        try {
            const pause = await PauseHistory.findByPk(pauseId);
            if (pause && pause.isActive) {
                const currentDuration = Math.floor((new Date() - pause.startTime) / 1000);

                if (currentDuration > durationLimit) {
                    // Enviar alerta a supervisor
                    if (global.io) {
                        global.io.emit('supervisor:alert', {
                            type: 'excessive_pause',
                            agentId: pause.agentId,
                            pauseId: pause.id,
                            pauseType: pause.pauseType,
                            currentDuration,
                            limitDuration: durationLimit,
                            timestamp: new Date()
                        });
                    }

                    // Marcar que se envió alerta
                    await pause.update({ alertSent: true });
                }
            }
        } catch (error) {
            logger.error('Error en checkPauseDuration', { error: error.message, stack: error.stack, pauseId, durationLimit });
        }
    }

    /**
     * Calcula eficiencia del agente desde métricas de Redis
     */
    calculateEfficiencyFromMetrics(metrics) {
        const productiveTime = metrics.productiveTime || 0;
        const pauseTime = metrics.pauseTime || 0;
        const totalTime = productiveTime + pauseTime;

        if (totalTime === 0) {
            return 0;
        }

        return Math.round((productiveTime / totalTime) * 100);
    }

    /**
     * Calcula eficiencia del agente desde métricas de sesión
     */
    calculateEfficiency(sessionMetrics, pauseMetrics) {
        if (!sessionMetrics || !sessionMetrics.totalTime) {
            return 0;
        }

        const productiveTime = sessionMetrics.productiveTime || 0;
        const totalTime = sessionMetrics.totalTime;

        return totalTime > 0 ? Math.round((productiveTime / totalTime) * 100) : 0;
    }

    /**
     * Sprint 2.2: Obtener sesión activa de un agente
     */
    async getActiveSession(agentId) {
        try {
            const workSession = await WorkSession.findOne({
                where: {
                    agentId,
                    logoutTime: null
                },
                order: [['loginTime', 'DESC']]
            });

            return workSession;
        } catch (error) {
            logger.error('Error obteniendo sesión activa:', error);
            throw error;
        }
    }

    /**
     * Sprint 2.2: Obtener estado actual del agente
     */
    async getCurrentStatus(agentId) {
        try {
            const agentStatus = await AgentStatus.findOne({
                where: { agentId },
                order: [['startTime', 'DESC']]
            });

            return agentStatus;
        } catch (error) {
            logger.error('Error obteniendo estado actual:', error);
            throw error;
        }
    }

    /**
     * Sprint 2.2: Obtener pausa activa del agente
     */
    async getActivePause(agentId) {
        try {
            const activePause = await PauseHistory.findOne({
                where: {
                    agentId,
                    endTime: null
                },
                order: [['startTime', 'DESC']]
            });

            return activePause;
        } catch (error) {
            logger.error('Error obteniendo pausa activa:', error);
            throw error;
        }
    }

    /**
     * Sprint 2.2: Obtener historial de estados
     */
    async getStatusHistory(agentId, options = {}) {
        try {
            const {
                startDate = null,
                endDate = null,
                limit = 50,
                offset = 0
            } = options;

            const where = { agentId };

            if (startDate || endDate) {
                where.startTime = {};
                if (startDate) where.startTime[sequelize.Sequelize.Op.gte] = startDate;
                if (endDate) where.startTime[sequelize.Sequelize.Op.lte] = endDate;
            }

            const history = await AgentStatus.findAll({
                where,
                order: [['startTime', 'DESC']],
                limit: parseInt(limit),
                offset: parseInt(offset)
            });

            return history;
        } catch (error) {
            logger.error('Error obteniendo historial de estados:', error);
            throw error;
        }
    }
}

export default new AgentStatusService();