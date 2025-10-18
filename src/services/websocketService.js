import db from '../models/index.js';

class WebSocketService {
    constructor() {
        this.io = null;
        this.connectedAgents = new Map(); // userId -> socket
        this.connectedOperations = new Map(); // userId -> socket
    }

    initialize(io) {
        this.io = io;
        
        this.io.on('connection', (socket) => {
            console.log(`🔌 Socket connected: ${socket.id}`);
            
            // Handle agent authentication
            socket.on('authenticate', async (data) => {
                try {
                    const { userId, role } = data;
                    
                    if (!userId || !role) {
                        socket.emit('error', { message: 'Authentication data required' });
                        return;
                    }

                    // Verify user exists
                    const user = await db.User.findByPk(userId);
                    if (!user) {
                        socket.emit('error', { message: 'User not found' });
                        return;
                    }

                    socket.userId = userId;
                    socket.userRole = role;

                    // Store socket connection
                    if (role === 'AGENTE') {
                        this.connectedAgents.set(userId, socket);
                        console.log(`🤖 Agent ${user.primerNombre} connected`);
                        
                        // Notify operations that agent is online
                        this.broadcastToOperations('agent_connected', {
                            agentId: userId,
                            agentName: `${user.primerNombre} ${user.primerApellido}`,
                            status: user.status,
                            timestamp: new Date()
                        });
                        
                    } else if (role === 'OPERATIONS' || role === 'ADMIN') {
                        this.connectedOperations.set(userId, socket);
                        console.log(`👨‍💼 Operations user ${user.primerNombre} connected`);
                        
                        // Send current agent status to new operations user
                        await this.sendAgentStatusToOperations(userId);
                    }

                    socket.emit('authenticated', { success: true });
                    
                } catch (error) {
                    console.error('Socket authentication error:', error);
                    socket.emit('error', { message: 'Authentication failed' });
                }
            });

            // Handle agent status updates
            socket.on('update_status', async (data) => {
                try {
                    const { status, reason } = data;
                    
                    if (!socket.userId || !status) {
                        socket.emit('error', { message: 'Status and user ID required' });
                        return;
                    }

                    // Calculate duration of previous status
                    const user = await db.User.findByPk(socket.userId);
                    let duration = 0;
                    
                    if (user.lastStatusChange) {
                        duration = Math.floor((new Date() - user.lastStatusChange) / 1000);
                    }

                    // Update user status in database
                    await db.User.update(
                        { 
                            status: status,
                            lastStatusChange: new Date()
                        },
                        { where: { id: socket.userId } }
                    );

                    // Log status change
                    await db.AgentStatusLog.create({
                        userId: socket.userId,
                        status: status,
                        duration: duration,
                        metadata: {
                            changedBy: socket.userId,
                            source: 'socket',
                            reason: reason || 'Agente cambió estado'
                        }
                    });

                    // Broadcast to operations
                    this.broadcastToOperations('agent_status_updated', {
                        agentId: socket.userId,
                        status: status,
                        timestamp: new Date(),
                        duration: duration,
                        reason: reason || 'Agente cambió estado'
                    });

                    // Confirm to agent
                    socket.emit('status_updated', { 
                        status: status,
                        timestamp: new Date()
                    });

                } catch (error) {
                    console.error('Status update error:', error);
                    socket.emit('error', { message: 'Failed to update status' });
                }
            });

            // Handle agent location/position updates
            socket.on('update_position', (data) => {
                // For future implementation - agent position tracking
                this.broadcastToOperations('agent_position_updated', {
                    agentId: socket.userId,
                    position: data.position,
                    timestamp: new Date()
                });
            });

            // Handle operations commands
            socket.on('command_agent', async (data) => {
                try {
                    const { targetAgentId, command, params } = data;
                    
                    if (socket.userRole !== 'OPERATIONS' && socket.userRole !== 'ADMIN') {
                        socket.emit('error', { message: 'Unauthorized' });
                        return;
                    }

                    const targetSocket = this.connectedAgents.get(targetAgentId);
                    if (!targetSocket) {
                        socket.emit('error', { message: 'Agent not connected' });
                        return;
                    }

                    // Send command to agent
                    targetSocket.emit('command', {
                        command: command,
                        params: params,
                        fromUserId: socket.userId,
                        timestamp: new Date()
                    });

                } catch (error) {
                    console.error('Command error:', error);
                    socket.emit('error', { message: 'Failed to send command' });
                }
            });

            // Handle disconnect
            socket.on('disconnect', async () => {
                console.log(`🔌 Socket disconnected: ${socket.id}`);
                
                if (socket.userId) {
                    const user = await db.User.findByPk(socket.userId);
                    
                    if (socket.userRole === 'AGENTE') {
                        this.connectedAgents.delete(socket.userId);
                        
                        // Update agent status to offline
                        if (user) {
                            await db.User.update(
                                { status: 'offline', lastStatusChange: new Date() },
                                { where: { id: socket.userId } }
                            );

                            // Log disconnection
                            await db.AgentStatusLog.create({
                                userId: socket.userId,
                                status: 'offline',
                                metadata: {
                                    source: 'socket_disconnect',
                                    reason: 'Conexión perdida'
                                }
                            });
                        }

                        // Notify operations
                        this.broadcastToOperations('agent_disconnected', {
                            agentId: socket.userId,
                            agentName: user ? `${user.primerNombre} ${user.primerApellido}` : 'Unknown',
                            timestamp: new Date()
                        });
                        
                    } else if (socket.userRole === 'OPERATIONS' || socket.userRole === 'ADMIN') {
                        this.connectedOperations.delete(socket.userId);
                    }
                }
            });
        });

        console.log('🔌 WebSocket service initialized');
    }

    // Send current agent status to operations user
    async sendAgentStatusToOperations(operationsUserId) {
        try {
            const agents = await db.User.findAll({
                where: { rol: 'AGENTE' },
                attributes: ['id', 'primerNombre', 'primerApellido', 'username', 'status', 'lastStatusChange']
            });

            const socket = this.connectedOperations.get(operationsUserId);
            if (socket) {
                socket.emit('agent_status_list', {
                    agents: agents.map(agent => ({
                        id: agent.id,
                        name: `${agent.primerNombre} ${agent.primerApellido}`,
                        username: agent.username,
                        status: agent.status,
                        lastStatusChange: agent.lastStatusChange,
                        isOnline: this.connectedAgents.has(agent.id)
                    })),
                    timestamp: new Date()
                });
            }
        } catch (error) {
            console.error('Error sending agent status to operations:', error);
        }
    }

    // Broadcast to all connected operations users
    broadcastToOperations(event, data) {
        this.connectedOperations.forEach((socket, userId) => {
            socket.emit(event, data);
        });
    }

    // Send message to specific agent
    sendToAgent(agentId, event, data) {
        const socket = this.connectedAgents.get(agentId);
        if (socket) {
            socket.emit(event, data);
            return true;
        }
        return false;
    }

    // Get connected agents count
    getConnectedAgentsCount() {
        return this.connectedAgents.size;
    }

    // Get connected operations users count
    getConnectedOperationsCount() {
        return this.connectedOperations.size;
    }

    // Get agent connection status
    isAgentConnected(agentId) {
        return this.connectedAgents.has(agentId);
    }
}

export default new WebSocketService();