/**
 * Real-time Analytics Service
 * WebSocket-based real-time data streaming y dashboards
 */

import { WebSocketServer, WebSocket } from 'ws';
import jwtService from './jwtService.js';
import db from '../models/index.js';
import EventEmitter from 'events';

class RealtimeService extends EventEmitter {
    constructor() {
        super();
        this.wss = null;
        this.port = process.env.WS_PORT || 3009;
        this.clients = new Map(); // clientId -> client info
        this.rooms = new Map(); // roomName -> Set of clientIds
        this.metrics = new Map(); // cache para métricas en tiempo real
        this.updateInterval = 5000; // 5 segundos para updates
        this.metricsIntervals = new Map(); // para limpiar intervals

        console.log('📊 Realtime Service initialized');
    }

    /**
     * Iniciar WebSocket server
     */
    start() {
        try {
            this.wss = new WebSocketServer({
                port: this.port,
                verifyClient: this.verifyClient.bind(this)
            });

            this.wss.on('connection', this.handleConnection.bind(this));
            this.wss.on('error', this.handleError.bind(this));

            // Iniciar actualización periódica de métricas
            this.startMetricsUpdates();

            console.log(`📊 WebSocket Server running on port ${this.port}`);
            return this.wss;
        } catch (error) {
            console.error('Failed to start WebSocket server:', error);
            throw error;
        }
    }

    /**
     * Verificar autenticación de cliente WebSocket
     */
    verifyClient(info) {
        try {
            const token = this.extractToken(info.req);

            if (!token) {
                console.warn('🚫 WebSocket connection rejected: No token provided');
                return false;
            }

            const decoded = jwtService.verifyAccessToken(token);
            info.req.user = decoded;

            console.log(`✅ WebSocket client authenticated: ${decoded.userId} (${decoded.rol})`);
            return true;
        } catch (error) {
            console.warn('🚫 WebSocket connection rejected: Invalid token', error.message);
            return false;
        }
    }

    /**
     * Extraer JWT token de request WebSocket
     */
    extractToken(req) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        return url.searchParams.get('token') ||
               req.headers.authorization?.replace('Bearer ', '');
    }

    /**
     * Manejar nueva conexión WebSocket
     */
    handleConnection(ws, req) {
        const clientId = this.generateClientId();
        const user = req.user;

        // Registrar cliente
        const clientInfo = {
            id: clientId,
            userId: user.userId,
            role: user.rol,
            sessionId: user.sessionId,
            socket: ws,
            connectedAt: new Date(),
            lastPing: new Date(),
            rooms: new Set(),
            subscriptions: new Set()
        };

        this.clients.set(clientId, clientInfo);

        // Enviar mensaje de bienvenida
        this.sendToClient(clientId, {
            type: 'connection',
            data: {
                clientId,
                userId: user.userId,
                role: user.rol,
                message: 'Connected to Welcomedly Real-time Service',
                timestamp: new Date().toISOString()
            }
        });

        // Configurar event handlers para el socket
        ws.on('message', (data) => this.handleMessage(clientId, data));
        ws.on('close', () => this.handleDisconnect(clientId));
        ws.on('error', (error) => this.handleError(clientId, error));
        ws.on('pong', () => this.handlePong(clientId));

        // Iniciar heartbeat para este cliente
        this.startHeartbeat(clientId);

        console.log(`👤 Client connected: ${clientId} (User: ${user.userId}, Role: ${user.rol})`);
    }

    /**
     * Manejar mensajes de cliente
     */
    handleMessage(clientId, rawData) {
        try {
            const message = JSON.parse(rawData);
            const client = this.clients.get(clientId);

            if (!client) {
                console.warn('Message from unknown client:', clientId);
                return;
            }

            // Actualizar last activity
            client.lastPing = new Date();

            switch (message.type) {
                case 'subscribe':
                    this.handleSubscription(clientId, message.data);
                    break;

                case 'unsubscribe':
                    this.handleUnsubscription(clientId, message.data);
                    break;

                case 'join_room':
                    this.handleJoinRoom(clientId, message.data);
                    break;

                case 'leave_room':
                    this.handleLeaveRoom(clientId, message.data);
                    break;

                case 'get_metrics':
                    this.handleGetMetrics(clientId, message.data);
                    break;

                case 'ping':
                    this.sendToClient(clientId, { type: 'pong' });
                    break;

                default:
                    console.warn('Unknown message type:', message.type);
                    this.sendToClient(clientId, {
                        type: 'error',
                        data: { message: 'Unknown message type' }
                    });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            this.sendToClient(clientId, {
                type: 'error',
                data: { message: 'Invalid message format' }
            });
        }
    }

    /**
     * Manejar suscripciones a eventos
     */
    handleSubscription(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;

        const { event, filters = {} } = data;

        // Verificar permisos
        if (!this.canSubscribe(client.role, event)) {
            this.sendToClient(clientId, {
                type: 'error',
                data: { message: 'Insufficient permissions for subscription' }
            });
            return;
        }

        client.subscriptions.add(JSON.stringify({ event, filters }));

        this.sendToClient(clientId, {
            type: 'subscription_confirmed',
            data: { event, filters }
        });

        // Enviar datos iniciales si existen
        this.sendInitialData(clientId, event, filters);

        console.log(`📝 Client ${clientId} subscribed to: ${event}`);
    }

    /**
     * Manejar unsuscripciones
     */
    handleUnsubscription(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;

        const { event, filters = {} } = data;
        const subscriptionKey = JSON.stringify({ event, filters });

        client.subscriptions.delete(subscriptionKey);

        this.sendToClient(clientId, {
            type: 'unsubscription_confirmed',
            data: { event, filters }
        });

        console.log(`🚫 Client ${clientId} unsubscribed from: ${event}`);
    }

    /**
     * Manejar join a room
     */
    handleJoinRoom(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;

        const { room } = data;

        // Verificar permisos para room
        if (!this.canJoinRoom(client.role, room)) {
            this.sendToClient(clientId, {
                type: 'error',
                data: { message: 'Cannot join this room' }
            });
            return;
        }

        // Agregar a room
        if (!this.rooms.has(room)) {
            this.rooms.set(room, new Set());
        }
        this.rooms.get(room).add(clientId);
        client.rooms.add(room);

        this.sendToClient(clientId, {
            type: 'room_joined',
            data: { room, memberCount: this.rooms.get(room).size }
        });

        // Notificar a otros en la room
        this.broadcastToRoom(room, {
            type: 'user_joined',
            data: { userId: client.userId, memberCount: this.rooms.get(room).size }
        }, clientId);

        console.log(`🏠 Client ${clientId} joined room: ${room}`);
    }

    /**
     * Manejar leave de room
     */
    handleLeaveRoom(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;

        const { room } = data;

        if (this.rooms.has(room)) {
            this.rooms.get(room).delete(clientId);
            client.rooms.delete(room);

            // Si la room queda vacía, eliminarla
            if (this.rooms.get(room).size === 0) {
                this.rooms.delete(room);
            } else {
                // Notificar a otros en la room
                this.broadcastToRoom(room, {
                    type: 'user_left',
                    data: { userId: client.userId, memberCount: this.rooms.get(room).size }
                }, clientId);
            }
        }

        this.sendToClient(clientId, {
            type: 'room_left',
            data: { room }
        });

        console.log(`🚪 Client ${clientId} left room: ${room}`);
    }

    /**
     * Manejar solicitud de métricas
     */
    async handleGetMetrics(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;

        const { metrics, timeframe = 'realtime' } = data;

        try {
            const results = await this.getMetrics(metrics, timeframe, client);

            this.sendToClient(clientId, {
                type: 'metrics_data',
                data: {
                    metrics: results,
                    timeframe,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            console.error('Error getting metrics:', error);
            this.sendToClient(clientId, {
                type: 'error',
                data: { message: 'Failed to get metrics' }
            });
        }
    }

    /**
     * Verificar permisos de suscripción
     */
    canSubscribe(role, event) {
        const permissions = {
            'ADMIN': [
                'campaigns', 'agents', 'analytics', 'system', 'calls',
                'performance', 'reports', 'notifications', 'ai_insights'
            ],
            'AGENTE': [
                'campaigns', 'performance', 'calls', 'notifications'
            ]
        };

        return permissions[role]?.includes(event) || false;
    }

    /**
     * Verificar permisos para room
     */
    canJoinRoom(role, room) {
        // Rooms generales disponibles para todos
        const publicRooms = ['general', 'notifications'];

        // Rooms específicos por rol
        const roleRooms = {
            'ADMIN': ['admin_panel', 'system_monitoring', 'all_campaigns'],
            'AGENTE': ['agent_dashboard', 'campaign_updates']
        };

        return publicRooms.includes(room) ||
               roleRooms[role]?.includes(room) ||
               room.startsWith('campaign_') || // Campaign-specific rooms
               room.startsWith('agent_');      // Agent-specific rooms
    }

    /**
     * Enviar datos iniciales para suscripción
     */
    async sendInitialData(clientId, event, filters) {
        try {
            let data = null;

            switch (event) {
                case 'campaigns':
                    data = await this.getCampaignsData(filters);
                    break;
                case 'agents':
                    data = await this.getAgentsData(filters);
                    break;
                case 'performance':
                    data = await this.getPerformanceData(filters);
                    break;
                case 'calls':
                    data = await this.getCallsData(filters);
                    break;
            }

            if (data) {
                this.sendToClient(clientId, {
                    type: 'initial_data',
                    data: { event, data }
                });
            }
        } catch (error) {
            console.error('Error sending initial data:', error);
        }
    }

    /**
     * Iniciar actualización periódica de métricas
     */
    startMetricsUpdates() {
        // Actualizar métricas cada 5 segundos
        const interval = setInterval(async () => {
            try {
                await this.updateAllMetrics();
                this.broadcastMetricsUpdate();
            } catch (error) {
                console.error('Error updating metrics:', error);
            }
        }, this.updateInterval);

        this.metricsIntervals.set('main', interval);
        console.log('📈 Started metrics updates (5s interval)');
    }

    /**
     * Actualizar todas las métricas
     */
    async updateAllMetrics() {
        const now = new Date();

        // Métricas de campañas
        const campaignMetrics = await this.getCampaignMetrics();
        this.metrics.set('campaigns', {
            data: campaignMetrics,
            timestamp: now
        });

        // Métricas de agentes
        const agentMetrics = await this.getAgentMetrics();
        this.metrics.set('agents', {
            data: agentMetrics,
            timestamp: now
        });

        // Métricas de llamadas
        const callMetrics = await this.getCallMetrics();
        this.metrics.set('calls', {
            data: callMetrics,
            timestamp: now
        });

        // Métricas de sistema
        const systemMetrics = this.getSystemMetrics();
        this.metrics.set('system', {
            data: systemMetrics,
            timestamp: now
        });
    }

    /**
     * Obtener métricas de campañas
     */
    async getCampaignMetrics() {
        try {
            const [total, active, completed] = await Promise.all([
                db.Campana.count(),
                db.Campana.count({ where: { activa: true } }),
                db.Campana.count({ where: { finalizada: true } })
            ]);

            const totalLeads = await db.BaseCampana.count();

            return {
                total,
                active,
                completed,
                totalLeads,
                activeRate: total > 0 ? (active / total * 100).toFixed(1) : 0
            };
        } catch (error) {
            console.error('Error getting campaign metrics:', error);
            return { error: error.message };
        }
    }

    /**
     * Obtener métricas de agentes
     */
    async getAgentMetrics() {
        try {
            const [total, active, online] = await Promise.all([
                db.Usuario.count({ where: { rol: 'AGENTE' } }),
                db.Usuario.count({ where: { rol: 'AGENTE', activo: true } }),
                this.getOnlineAgentsCount() // Contar agentes online
            ]);

            return {
                total,
                active,
                online,
                onlineRate: total > 0 ? (online / total * 100).toFixed(1) : 0
            };
        } catch (error) {
            console.error('Error getting agent metrics:', error);
            return { error: error.message };
        }
    }

    /**
     * Obtener métricas de llamadas
     */
    async getCallMetrics() {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const [todayCalls, successfulCalls, totalCalls] = await Promise.all([
                db.BaseCampana.count({
                    where: {
                        updatedAt: {
                            [db.Sequelize.Op.gte]: today
                        }
                    }
                }),
                db.BaseCampana.count({
                    where: {
                        disposicionId: {
                            [db.Sequelize.Op.in]: [1, 2] // IDs de disposiciones exitosas
                        }
                    }
                }),
                db.BaseCampana.count()
            ]);

            return {
                today: todayCalls,
                successful: successfulCalls,
                total: totalCalls,
                successRate: totalCalls > 0 ? (successfulCalls / totalCalls * 100).toFixed(1) : 0
            };
        } catch (error) {
            console.error('Error getting call metrics:', error);
            return { error: error.message };
        }
    }

    /**
     * Obtener métricas de sistema
     */
    getSystemMetrics() {
        return {
            connectedClients: this.clients.size,
            activeRooms: this.rooms.size,
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime(),
            cpuUsage: process.cpuUsage(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Obtener count de agentes online (simulado)
     */
    async getOnlineAgentsCount() {
        // En producción, esto vendría de un sistema de presence real
        // Por ahora, contar clientes conectados con rol AGENTE
        let onlineAgents = 0;
        for (const client of this.clients.values()) {
            if (client.role === 'AGENTE') {
                onlineAgents++;
            }
        }
        return onlineAgents;
    }

    /**
     * Broadcast de actualización de métricas
     */
    broadcastMetricsUpdate() {
        const updateMessage = {
            type: 'metrics_update',
            data: {
                metrics: Object.fromEntries(this.metrics),
                timestamp: new Date().toISOString()
            }
        };

        // Enviar a todos los clientes suscritos a métricas
        for (const [clientId, client] of this.clients) {
            if (this.isSubscribedTo(client, 'analytics')) {
                this.sendToClient(clientId, updateMessage);
            }
        }
    }

    /**
     * Verificar si cliente está suscrito a un evento
     */
    isSubscribedTo(client, event) {
        for (const subscription of client.subscriptions) {
            const parsed = JSON.parse(subscription);
            if (parsed.event === event) {
                return true;
            }
        }
        return false;
    }

    /**
     * Enviar mensaje a cliente específico
     */
    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (client && client.socket.readyState === WebSocket.OPEN) {
            try {
                client.socket.send(JSON.stringify(message));
            } catch (error) {
                console.error('Error sending to client:', error);
                this.handleDisconnect(clientId);
            }
        }
    }

    /**
     * Broadcast a room
     */
    broadcastToRoom(room, message, excludeClientId = null) {
        const roomClients = this.rooms.get(room);
        if (!roomClients) return;

        for (const clientId of roomClients) {
            if (clientId !== excludeClientId) {
                this.sendToClient(clientId, message);
            }
        }
    }

    /**
     * Broadcast a todos los clientes
     */
    broadcast(message, excludeRole = null) {
        for (const [clientId, client] of this.clients) {
            if (!excludeRole || client.role !== excludeRole) {
                this.sendToClient(clientId, message);
            }
        }
    }

    /**
     * Manejar desconexión de cliente
     */
    handleDisconnect(clientId) {
        const client = this.clients.get(clientId);
        if (!client) return;

        // Remover de rooms
        for (const room of client.rooms) {
            if (this.rooms.has(room)) {
                this.rooms.get(room).delete(clientId);
                if (this.rooms.get(room).size === 0) {
                    this.rooms.delete(room);
                } else {
                    this.broadcastToRoom(room, {
                        type: 'user_left',
                        data: { userId: client.userId, memberCount: this.rooms.get(room).size }
                    }, clientId);
                }
            }
        }

        // Limpiar heartbeat
        if (client.heartbeatInterval) {
            clearInterval(client.heartbeatInterval);
        }

        // Remover cliente
        this.clients.delete(clientId);

        console.log(`👋 Client disconnected: ${clientId} (User: ${client.userId})`);
    }

    /**
     * Manejar errores de cliente
     */
    handleError(clientId, error) {
        console.error(`❌ Client error (${clientId}):`, error);
        this.handleDisconnect(clientId);
    }

    /**
     * Iniciar heartbeat para cliente
     */
    startHeartbeat(clientId) {
        const client = this.clients.get(clientId);
        if (!client) return;

        client.heartbeatInterval = setInterval(() => {
            if (client.socket.readyState === WebSocket.OPEN) {
                client.socket.ping();
            } else {
                this.handleDisconnect(clientId);
            }
        }, 30000); // 30 segundos
    }

    /**
     * Manejar pong response
     */
    handlePong(clientId) {
        const client = this.clients.get(clientId);
        if (client) {
            client.lastPing = new Date();
        }
    }

    /**
     * Generar client ID único
     */
    generateClientId() {
        return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Obtener estadísticas del servicio
     */
    getStats() {
        return {
            connectedClients: this.clients.size,
            activeRooms: this.rooms.size,
            totalSubscriptions: Array.from(this.clients.values())
                .reduce((total, client) => total + client.subscriptions.size, 0),
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime(),
            metricsCacheSize: this.metrics.size
        };
    }

    /**
     * Limpiar intervalos al shutdown
     */
    shutdown() {
        console.log('🛑 Shutting down Realtime Service...');

        // Limpiar intervals
        for (const interval of this.metricsIntervals.values()) {
            clearInterval(interval);
        }

        // Limpiar heartbeats de clientes
        for (const client of this.clients.values()) {
            if (client.heartbeatInterval) {
                clearInterval(client.heartbeatInterval);
            }
        }

        // Cerrar conexiones
        for (const client of this.clients.values()) {
            client.socket.close();
        }

        // Cerrar server
        if (this.wss) {
            this.wss.close();
        }

        console.log('✅ Realtime Service shutdown complete');
    }
}

export default new RealtimeService();