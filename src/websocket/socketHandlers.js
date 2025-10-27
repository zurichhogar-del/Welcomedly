import agentStatusService from '../services/agentStatusService.js';
import enhancedAIService from '../services/enhancedAIService.js';
import logger from '../utils/logger.js';

/**
 * Manejadores de eventos WebSocket para comunicación en tiempo real
 */
class SocketHandlers {
    constructor(io, sessionStore) {
        this.io = io;
        this.sessionStore = sessionStore; // Redis session store para validación
        this.connectedAgents = new Map(); // agentId -> socket.id
        this.supervisors = new Set(); // socket.id de supervisores conectados

        this.setupEventHandlers();
        this.setupPeriodicUpdates();
    }

    /**
     * Configurar manejadores de eventos WebSocket
     */
    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            logger.debug(`Cliente WebSocket conectado`, { socketId: socket.id });

            // Manejar autenticación del socket
            socket.on('authenticate', async (data) => {
                try {
                    const { sessionCookie } = data;

                    // Validar sesión (implementar middleware de sesión)
                    const session = await this.validateSession(sessionCookie);

                    if (session && session.usuario) {
                        socket.userId = session.usuario.id;
                        socket.userRole = session.usuario.rol;
                        socket.userName = session.usuario.nombre;

                        // Registrar conexión
                        if (session.usuario.rol === 'ADMIN' || session.usuario.rol === 'SUPERVISOR') {
                            this.supervisors.add(socket.id);
                        } else {
                            this.connectedAgents.set(session.usuario.id, socket.id);

                            // Notificar a supervisores que un agente se conectó
                            this.notifySupervisors('agent:connected', {
                                agentId: session.usuario.id,
                                agentName: session.usuario.nombre,
                                timestamp: new Date()
                            });
                        }

                        socket.emit('authenticated', {
                            success: true,
                            role: session.usuario.rol,
                            userId: session.usuario.id
                        });

                        logger.info(`Usuario autenticado vía WebSocket`, { userName: session.usuario.nombre, userId: session.usuario.id, role: session.usuario.rol });

                        // Enviar estado inicial del agente
                        await this.sendAgentInitialStatus(socket, session.usuario.id);

                    } else {
                        socket.emit('authenticated', {
                            success: false,
                            error: 'Sesión inválida'
                        });
                    }
                } catch (error) {
                    logger.error('Error en autenticación WebSocket', { error: error.message, stack: error.stack });
                    socket.emit('authenticated', {
                        success: false,
                        error: 'Error de autenticación'
                    });
                }
            });

            // Manejar cambio de estado del agente
            socket.on('agent:change_status', async (data) => {
                try {
                    if (!socket.userId) {
                        socket.emit('error', { message: 'No autenticado' });
                        return;
                    }

                    const { status, reason, metadata } = data;

                    await agentStatusService.changeAgentStatus(
                        socket.userId,
                        status,
                        reason,
                        { ...metadata, socketId: socket.id }
                    );

                    // Actualizar estado del agente en todos los clientes conectados
                    this.broadcastAgentStatus(socket.userId, {
                        status,
                        reason,
                        timestamp: new Date()
                    });

                } catch (error) {
                    logger.error('Error en agent:change_status', { error: error.message, stack: error.stack, userId: socket.userId });
                    socket.emit('error', { message: error.message });
                }
            });

            // Manejar inicio de pausa
            socket.on('agent:start_pause', async (data) => {
                try {
                    if (!socket.userId) {
                        socket.emit('error', { message: 'No autenticado' });
                        return;
                    }

                    const { pauseType, reason } = data;

                    await agentStatusService.startPause(
                        socket.userId,
                        pauseType,
                        reason,
                        { socketId: socket.id, ipAddress: socket.handshake.address }
                    );

                    socket.emit('pause:started', {
                        pauseType,
                        startTime: new Date(),
                        message: 'Pausa iniciada correctamente'
                    });

                    // Notificar a supervisores
                    this.notifySupervisors('agent:pause:started', {
                        agentId: socket.userId,
                        agentName: socket.userName,
                        pauseType,
                        startTime: new Date()
                    });

                } catch (error) {
                    logger.error('Error en agent:start_pause', { error: error.message, stack: error.stack, userId: socket.userId, pauseType: data.pauseType });
                    socket.emit('error', { message: error.message });
                }
            });

            // Manejar fin de pausa
            socket.on('agent:end_pause', async () => {
                try {
                    if (!socket.userId) {
                        socket.emit('error', { message: 'No autenticado' });
                        return;
                    }

                    const pause = await agentStatusService.endPause(socket.userId);

                    socket.emit('pause:ended', {
                        endTime: new Date(),
                        duration: pause.duration,
                        message: 'Pausa finalizada'
                    });

                    // Notificar a supervisores
                    this.notifySupervisors('agent:pause:ended', {
                        agentId: socket.userId,
                        agentName: socket.userName,
                        endTime: new Date(),
                        duration: pause.duration
                    });

                } catch (error) {
                    logger.error('Error en agent:end_pause', { error: error.message, stack: error.stack, userId: socket.userId });
                    socket.emit('error', { message: error.message });
                }
            });

            // Manejar heartbeat para mantener conexión activa
            socket.on('heartbeat', () => {
                socket.emit('heartbeat_response', {
                    timestamp: new Date(),
                    latency: Date.now() - socket.lastPing || 0
                });
                socket.lastPing = Date.now();
            });

            // Sprint 2.2: Manejar desconexión con gracia period
            socket.on('disconnect', (reason) => {
                logger.debug(`Cliente WebSocket desconectado`, { socketId: socket.id, reason, userId: socket.userId });

                if (socket.userId) {
                    // Desconectar agente
                    this.connectedAgents.delete(socket.userId);

                    // Sprint 2.2: No cambiar estado a offline inmediatamente
                    // Dar 30 segundos de gracia para reconexión automática
                    const gracePeriod = 30000; // 30 segundos

                    // Guardar timeout para poder cancelarlo si se reconecta
                    socket.disconnectionTimeout = setTimeout(async () => {
                        try {
                            // Solo cambiar a offline si no se reconectó en el periodo de gracia
                            if (!this.connectedAgents.has(socket.userId)) {
                                await agentStatusService.changeAgentStatus(
                                    socket.userId,
                                    'offline',
                                    `Desconexión WebSocket: ${reason}`,
                                    { socketId: socket.id, disconnectionTime: new Date() }
                                );

                                logger.info('Agente marcado offline tras periodo de gracia', {
                                    userId: socket.userId,
                                    reason
                                });
                            }
                        } catch (error) {
                            logger.error('Error al marcar agente offline', {
                                error: error.message,
                                userId: socket.userId
                            });
                        }
                    }, gracePeriod);

                    // Notificar a supervisores
                    this.notifySupervisors('agent:disconnected', {
                        agentId: socket.userId,
                        agentName: socket.userName,
                        reason,
                        timestamp: new Date()
                    });
                }

                if (this.supervisors.has(socket.id)) {
                    this.supervisors.delete(socket.id);
                }
            });

            // Manejar solicitud de estado en tiempo real
            socket.on('get:realtime_metrics', async () => {
                try {
                    if (socket.userRole !== 'ADMIN' && socket.userRole !== 'SUPERVISOR') {
                        socket.emit('error', { message: 'Acceso denegado' });
                        return;
                    }

                    const metrics = await agentStatusService.getRealtimeMetrics();
                    socket.emit('realtime_metrics', metrics);

                } catch (error) {
                    logger.error('Error en get:realtime_metrics', { error: error.message, stack: error.stack });
                    socket.emit('error', { message: error.message });
                }
            });

            // Manejar solicitud de monitoreo de agente específico
            socket.on('monitor:agent', (agentId) => {
                if (socket.userRole !== 'ADMIN' && socket.userRole !== 'SUPERVISOR') {
                    socket.emit('error', { message: 'Acceso denegado' });
                    return;
                }

                // Unir al room de monitoreo del agente
                socket.join(`monitor:${agentId}`);
                socket.emit('monitoring:started', { agentId });
            });

            // Dejar de monitorear agente
            socket.on('stop:monitor:agent', (agentId) => {
                socket.leave(`monitor:${agentId}`);
                socket.emit('monitoring:stopped', { agentId });
            });

            // =================== Sprint 3.2: AI Assistant WebSocket Events ===================

            // Sprint 3.2: Solicitar sugerencias IA
            socket.on('ai:request_suggestions', async (data) => {
                try {
                    if (!socket.userId) {
                        socket.emit('error', { message: 'No autenticado' });
                        return;
                    }

                    const { context, customerMessage } = data;

                    logger.info('Sprint 3.2: WebSocket - Solicitando sugerencias IA', {
                        agentId: socket.userId,
                        context
                    });

                    const result = await enhancedAIService.getRealTimeAssistance({
                        agentId: socket.userId,
                        context: context || {},
                        customerMessage: customerMessage || 'Sin mensaje del cliente'
                    });

                    socket.emit('ai:suggestion', {
                        suggestions: result.suggestions || [
                            { title: 'Mantén el profesionalismo', text: 'Usa un tono amable y profesional' },
                            { title: 'Escucha activa', text: 'Repite puntos clave para mostrar comprensión' },
                            { title: 'Ofrece soluciones', text: 'Proporciona alternativas personalizadas' }
                        ],
                        sentiment: result.sentiment || { type: 'neutral', confidence: 0.5 },
                        timestamp: new Date()
                    });

                } catch (error) {
                    logger.error('Error en ai:request_suggestions', {
                        error: error.message,
                        userId: socket.userId
                    });
                    socket.emit('error', { message: 'Error obteniendo sugerencias IA' });
                }
            });

            // Sprint 3.2: Transcripción de audio en tiempo real
            socket.on('ai:transcribe_audio', async (data) => {
                try {
                    if (!socket.userId) {
                        socket.emit('error', { message: 'No autenticado' });
                        return;
                    }

                    const { audioBuffer, speaker } = data;

                    logger.info('Sprint 3.2: WebSocket - Transcribiendo audio', {
                        agentId: socket.userId,
                        speaker
                    });

                    const transcription = await enhancedAIService.transcribeAudio(audioBuffer);

                    socket.emit('ai:transcription', {
                        text: transcription.text,
                        speaker: speaker || 'Cliente',
                        confidence: transcription.confidence || 0.9,
                        timestamp: new Date()
                    });

                    // Analizar sentimiento del texto transcrito
                    const sentiment = await enhancedAIService.analyzeSentiment(transcription.text);

                    socket.emit('ai:sentiment', {
                        sentiment: sentiment.type || 'neutral',
                        confidence: sentiment.confidence || 0.5,
                        timestamp: new Date()
                    });

                } catch (error) {
                    logger.error('Error en ai:transcribe_audio', {
                        error: error.message,
                        userId: socket.userId
                    });
                    socket.emit('error', { message: 'Error transcribiendo audio' });
                }
            });

            // Sprint 3.2: Analizar sentimiento manual
            socket.on('ai:analyze_sentiment', async (data) => {
                try {
                    if (!socket.userId) {
                        socket.emit('error', { message: 'No autenticado' });
                        return;
                    }

                    const { text } = data;

                    if (!text) {
                        socket.emit('error', { message: 'Se requiere texto para análisis' });
                        return;
                    }

                    logger.info('Sprint 3.2: WebSocket - Analizando sentimiento', {
                        agentId: socket.userId,
                        textLength: text.length
                    });

                    const sentiment = await enhancedAIService.analyzeSentiment(text);

                    socket.emit('ai:sentiment', {
                        sentiment: sentiment.type || 'neutral',
                        confidence: sentiment.confidence || 0.5,
                        details: sentiment.details,
                        timestamp: new Date()
                    });

                } catch (error) {
                    logger.error('Error en ai:analyze_sentiment', {
                        error: error.message,
                        userId: socket.userId
                    });
                    socket.emit('error', { message: 'Error analizando sentimiento' });
                }
            });

        });
    }

    /**
     * Enviar estado inicial al agente cuando se conecta
     */
    async sendAgentInitialStatus(socket, agentId) {
        try {
            const [agentStatus, workSession, activePause] = await Promise.all([
                agentStatusService.getCurrentStatus(agentId),
                agentStatusService.getActiveSession(agentId),
                agentStatusService.getActivePause(agentId)
            ]);

            socket.emit('initial_status', {
                agentStatus,
                workSession,
                activePause,
                timestamp: new Date()
            });

        } catch (error) {
            logger.error('Error enviando estado inicial', { error: error.message, stack: error.stack, agentId });
        }
    }

    /**
     * Difundir cambio de estado a todos los clientes relevantes
     */
    broadcastAgentStatus(agentId, statusData) {
        this.io.emit('agent:status_updated', {
            agentId,
            ...statusData
        });

        // También enviar al room de monitoreo específico
        this.io.to(`monitor:${agentId}`).emit('monitored_agent:status', statusData);
    }

    /**
     * Notificar a todos los supervisores conectados
     */
    notifySupervisors(event, data) {
        this.supervisors.forEach(socketId => {
            this.io.to(socketId).emit(event, data);
        });
    }

    /**
     * Configurar actualizaciones periódicas
     */
    setupPeriodicUpdates() {
        // Actualizar métricas cada 30 segundos para supervisores
        setInterval(async () => {
            try {
                if (this.supervisors.size > 0) {
                    const metrics = await agentStatusService.getRealtimeMetrics();
                    this.notifySupervisors('realtime_update', metrics);
                }
            } catch (error) {
                logger.error('Error en actualización periódica WebSocket', { error: error.message, stack: error.stack });
            }
        }, 30000);

        // Limpiar conexiones inactivas cada 5 minutos
        setInterval(() => {
            this.cleanupInactiveConnections();
        }, 300000);
    }

    /**
     * Limpiar conexiones inactivas
     */
    cleanupInactiveConnections() {
        // Implementar lógica para detectar y limpiar sockets inactivos
        logger.debug('Limpiando conexiones WebSocket inactivas', {
            agentesConectados: this.connectedAgents.size,
            supervisoresConectados: this.supervisors.size
        });
    }

    /**
     * Validar sesión desde cookie
     * Sprint 1.1: Implementación funcional con Redis session store
     */
    async validateSession(sessionCookie) {
        try {
            // Validar que tenemos session store
            if (!this.sessionStore) {
                logger.error('Session store no configurado en WebSocket');
                return null;
            }

            // Extraer session ID de la cookie
            const sessionId = this.extractSessionId(sessionCookie);

            if (!sessionId) {
                logger.debug('No se pudo extraer session ID de la cookie');
                return null;
            }

            logger.debug('Session ID extraído para WebSocket', { sessionId });

            // Buscar sesión en Redis store (promisify get method)
            return new Promise((resolve, reject) => {
                this.sessionStore.get(sessionId, (error, session) => {
                    if (error) {
                        logger.error('Error consultando session store', {
                            error: error.message,
                            stack: error.stack,
                            sessionId
                        });
                        return resolve(null);
                    }

                    if (!session) {
                        logger.debug('Sesión no encontrada o expirada', { sessionId });
                        return resolve(null);
                    }

                    // Validar que la sesión tenga datos de usuario
                    if (!session.usuario || !session.usuario.id) {
                        logger.debug('Sesión sin datos de usuario', { sessionId });
                        return resolve(null);
                    }

                    logger.info('Sesión WebSocket validada exitosamente', {
                        sessionId,
                        userId: session.usuario.id,
                        userRole: session.usuario.rol
                    });

                    resolve(session);
                });
            });
        } catch (error) {
            logger.error('Error validando sesión WebSocket', { error: error.message, stack: error.stack });
            return null;
        }
    }

    /**
     * Extraer session ID de cookie string
     * Sprint 1.1: Manejo mejorado de cookies firmadas
     */
    extractSessionId(cookieString) {
        if (!cookieString) {return null;}

        try {
            // Formato típico de express-session con firma: "connect.sid=s%3A[sessionId].[signature]"
            // Necesitamos extraer solo el sessionId, sin la firma

            // Buscar la cookie connect.sid en el string
            const cookieMatch = cookieString.match(/connect\.sid=([^;]+)/);

            if (!cookieMatch || !cookieMatch[1]) {
                logger.debug('Cookie connect.sid no encontrada', { cookieString });
                return null;
            }

            const cookieValue = decodeURIComponent(cookieMatch[1]);

            // Si la cookie está firmada (comienza con s:), extraer el valor sin firma
            if (cookieValue.startsWith('s:')) {
                // Remover el prefijo 's:' y la firma después del punto
                const sessionId = cookieValue.substring(2).split('.')[0];
                logger.debug('Session ID extraído de cookie firmada', { sessionId });
                return sessionId;
            }

            // Cookie sin firma (desarrollo sin secure)
            logger.debug('Session ID extraído de cookie sin firma', { sessionId: cookieValue });
            return cookieValue;

        } catch (error) {
            logger.error('Error extrayendo session ID', {
                error: error.message,
                stack: error.stack,
                cookieString
            });
            return null;
        }
    }

    /**
     * Obtener estadísticas de conexiones
     */
    getConnectionStats() {
        return {
            connectedAgents: this.connectedAgents.size,
            connectedSupervisors: this.supervisors.size,
            totalConnections: this.io.engine.clientsCount
        };
    }
}

export default SocketHandlers;