import agentStatusService from '../services/agentStatusService.js';
import { validationResult } from 'express-validator';

/**
 * Controlador para gestión de estados de agentes
 */
class AgentStatusController {
    /**
     * Cambiar estado del agente
     */
    async changeStatus(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                req.session.swalError = 'Datos inválidos';
                return res.redirect('back');
            }

            const { status, reason, metadata } = req.body;
            const agentId = req.session.usuario.id;

            // Agregar información del request al metadata
            const enhancedMetadata = {
                ...JSON.parse(metadata || '{}'),
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date()
            };

            const agentStatus = await agentStatusService.changeAgentStatus(
                agentId,
                status,
                reason,
                enhancedMetadata
            );

            req.session.mensajeExito = 'Estado actualizado correctamente';
            res.json({ success: true, agentStatus });

        } catch (error) {
            console.error('Error en changeStatus:', error);
            req.session.swalError = error.message;
            res.status(400).json({ success: false, error: error.message });
        }
    }

    /**
     * Iniciar pausa
     */
    async startPause(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { pauseType, reason } = req.body;
            const agentId = req.session.usuario.id;

            const metadata = {
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date()
            };

            const pause = await agentStatusService.startPause(
                agentId,
                pauseType,
                reason,
                metadata
            );

            res.json({ success: true, pause });

        } catch (error) {
            console.error('Error en startPause:', error);
            res.status(400).json({ success: false, error: error.message });
        }
    }

    /**
     * Finalizar pausa
     */
    async endPause(req, res) {
        try {
            const agentId = req.session.usuario.id;

            const pause = await agentStatusService.endPause(agentId);

            req.session.mensajeExito = 'Pausa finalizada correctamente';
            res.json({ success: true, pause });

        } catch (error) {
            console.error('Error en endPause:', error);
            req.session.swalError = error.message;
            res.status(400).json({ success: false, error: error.message });
        }
    }

    /**
     * Iniciar sesión de trabajo
     */
    async startSession(req, res) {
        try {
            const agentId = req.session.usuario.id;
            const { campaignId } = req.body;

            const metadata = {
                campaignId,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date()
            };

            const workSession = await agentStatusService.startWorkSession(
                agentId,
                metadata
            );

            req.session.mensajeExito = 'Sesión iniciada correctamente';
            res.json({ success: true, workSession });

        } catch (error) {
            console.error('Error en startSession:', error);
            req.session.swalError = error.message;
            res.status(400).json({ success: false, error: error.message });
        }
    }

    /**
     * Finalizar sesión de trabajo
     */
    async endSession(req, res) {
        try {
            const agentId = req.session.usuario.id;
            const endMetrics = req.body;

            const workSession = await agentStatusService.endWorkSession(
                agentId,
                endMetrics
            );

            // Cerrar sesión del usuario
            req.session.destroy();

            res.json({ success: true, workSession });

        } catch (error) {
            console.error('Error en endSession:', error);
            req.session.swalError = error.message;
            res.status(400).json({ success: false, error: error.message });
        }
    }

    /**
     * Obtener estado actual del agente
     */
    async getCurrentStatus(req, res) {
        try {
            const agentId = req.params.agentId || req.session.usuario.id;

            // Solo permitir ver propio estado o si es supervisor
            if (agentId !== req.session.usuario.id && req.session.usuario.rol !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    error: 'Acceso denegado'
                });
            }

            const agentStatus = await agentStatusService.getCurrentStatus(agentId);
            const workSession = await agentStatusService.getActiveSession(agentId);
            const activePause = await agentStatusService.getActivePause(agentId);

            res.json({
                success: true,
                data: {
                    agentStatus,
                    workSession,
                    activePause
                }
            });

        } catch (error) {
            console.error('Error en getCurrentStatus:', error);
            res.status(400).json({ success: false, error: error.message });
        }
    }

    /**
     * Obtener métricas de productividad
     */
    async getProductivityMetrics(req, res) {
        try {
            const agentId = req.params.agentId || req.session.usuario.id;
            const { period = 'today' } = req.query;

            // Solo permitir ver propias métricas o si es supervisor
            if (agentId !== req.session.usuario.id && req.session.usuario.rol !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    error: 'Acceso denegado'
                });
            }

            const metrics = await agentStatusService.getAgentProductivityMetrics(
                agentId,
                period
            );

            res.json({ success: true, data: metrics });

        } catch (error) {
            console.error('Error en getProductivityMetrics:', error);
            res.status(400).json({ success: false, error: error.message });
        }
    }

    /**
     * Obtener métricas en tiempo real (solo supervisores)
     */
    async getRealtimeMetrics(req, res) {
        try {
            // Solo supervisores pueden ver métricas en tiempo real
            if (req.session.usuario.rol !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    error: 'Acceso denegado'
                });
            }

            const metrics = await agentStatusService.getRealtimeMetrics();

            res.json({ success: true, data: metrics });

        } catch (error) {
            console.error('Error en getRealtimeMetrics:', error);
            res.status(400).json({ success: false, error: error.message });
        }
    }

    /**
     * Obtener historial de estados
     */
    async getStatusHistory(req, res) {
        try {
            const agentId = req.params.agentId || req.session.usuario.id;
            const {
                startDate,
                endDate,
                limit = 50,
                offset = 0
            } = req.query;

            // Solo permitir ver propio historial o si es supervisor
            if (agentId !== req.session.usuario.id && req.session.usuario.rol !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    error: 'Acceso denegado'
                });
            }

            const history = await agentStatusService.getStatusHistory(
                agentId,
                {
                    startDate: startDate ? new Date(startDate) : null,
                    endDate: endDate ? new Date(endDate) : null,
                    limit: parseInt(limit),
                    offset: parseInt(offset)
                }
            );

            res.json({ success: true, data: history });

        } catch (error) {
            console.error('Error en getStatusHistory:', error);
            res.status(400).json({ success: false, error: error.message });
        }
    }

    /**
     * Obtener métricas actuales desde Redis (tiempo real)
     */
    async getCurrentMetrics(req, res) {
        try {
            const agentId = req.params.agentId || req.session.usuario.id;

            // Solo permitir ver propias métricas o si es supervisor
            if (agentId !== req.session.usuario.id && req.session.usuario.rol !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    error: 'Acceso denegado'
                });
            }

            const metrics = await agentStatusService.getCurrentMetrics(agentId);

            res.json({
                success: true,
                data: metrics,
                timestamp: new Date()
            });

        } catch (error) {
            console.error('Error en getCurrentMetrics:', error);
            res.status(500).json({
                success: false,
                error: 'Error al obtener métricas actuales',
                message: error.message
            });
        }
    }

    /**
     * Sprint 2.2: Obtener sesión activa para recuperación de estado
     * Endpoint: GET /api/agent/session/active
     */
    async getActiveSessionForRecovery(req, res) {
        try {
            const agentId = req.session.usuario.id;

            const [workSession, agentStatus, metrics] = await Promise.all([
                agentStatusService.getActiveSession(agentId),
                agentStatusService.getCurrentStatus(agentId),
                agentStatusService.getCurrentMetrics(agentId)
            ]);

            if (!workSession) {
                return res.json({
                    success: false,
                    message: 'No active session'
                });
            }

            res.json({
                success: true,
                session: {
                    id: workSession.id,
                    status: agentStatus?.status || 'offline',
                    loginTime: workSession.loginTime,
                    productiveTime: metrics.metrics.productiveTime,
                    pauseTime: metrics.metrics.pauseTime,
                    callTime: metrics.metrics.callTime,
                    calls: metrics.metrics.calls,
                    sales: metrics.metrics.sales,
                    campaignId: workSession.campaignId
                }
            });

        } catch (error) {
            console.error('Error en getActiveSessionForRecovery:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * API endpoint para WebSocket updates
     */
    async getLiveStatus(req, res) {
        try {
            const agentId = req.session.usuario.id;

            // Enviar estado actual
            const [agentStatus, workSession, activePause] = await Promise.all([
                agentStatusService.getCurrentStatus(agentId),
                agentStatusService.getActiveSession(agentId),
                agentStatusService.getActivePause(agentId)
            ]);

            res.json({
                success: true,
                data: {
                    agentStatus,
                    workSession,
                    activePause,
                    timestamp: new Date()
                }
            });

        } catch (error) {
            console.error('Error en getLiveStatus:', error);
            res.status(400).json({ success: false, error: error.message });
        }
    }

    /**
     * Mostrar dashboard de supervisor (VIEW)
     */
    async showSupervisorDashboard(req, res) {
        try {
            // Validar que el usuario es supervisor o admin
            if (req.session.usuario.rol !== 'ADMIN' && req.session.usuario.rol !== 'SUPERVISOR') {
                req.session.swalError = 'Acceso denegado. Se requiere rol de supervisor.';
                return res.redirect('/');
            }

            // Renderizar sin layout porque dashboard.ejs es una página HTML completa
            res.render('supervisor/dashboard', {
                title: 'Dashboard Supervisor - Welcomedly',
                usuario: req.session.usuario
            });

        } catch (error) {
            console.error('Error en showSupervisorDashboard:', error);
            req.session.swalError = 'Error al cargar el dashboard';
            res.redirect('/');
        }
    }

    /**
     * API: Obtener métricas completas para dashboard de supervisor
     */
    async getSupervisorMetrics(req, res) {
        try {
            // Solo supervisores pueden acceder
            if (req.session.usuario.rol !== 'ADMIN') {
                return res.status(403).json({
                    success: false,
                    error: 'Acceso denegado'
                });
            }

            const metrics = await agentStatusService.getSupervisorDashboardMetrics();

            res.json({
                success: true,
                data: metrics
            });

        } catch (error) {
            console.error('Error en getSupervisorMetrics:', error);
            res.status(500).json({
                success: false,
                error: 'Error al obtener métricas del dashboard',
                message: error.message
            });
        }
    }
}

export default new AgentStatusController();