import express from 'express';
import { body, query, param } from 'express-validator';
import { loginLimiter } from '../middlewares/securityMiddleware.js';
import agentStatusController from '../controllers/agentStatusController.js';

const router = express.Router();

// Middleware para asegurar que el usuario está autenticado
const asegurarAutenticacion = (req, res, next) => {
    if (req.session && req.session.usuario) {
        return next();
    }
    req.session.swalError = 'Debes iniciar sesión para acceder a esta función';
    res.redirect('/auth/login');
};

// Middleware para supervisores
const ensureSupervisor = (req, res, next) => {
    if (req.session && req.session.usuario &&
        (req.session.usuario.rol === 'ADMIN' || req.session.usuario.rol === 'SUPERVISOR')) {
        return next();
    }
    res.status(403).json({
        success: false,
        error: 'Acceso denegado. Se requiere rol de supervisor.'
    });
};

/**
 * @swagger
 * /api/agent/status:
 *   post:
 *     summary: Cambiar estado del agente
 *     tags: [Agent Status]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [available, in_call, on_pause, after_call_work, training, meeting, offline]
 *               reason:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Estado actualizado correctamente
 */
router.post('/status',
    asegurarAutenticacion,
    loginLimiter,
    [
        body('status')
            .isIn(['available', 'in_call', 'on_pause', 'after_call_work', 'training', 'meeting', 'offline'])
            .withMessage('Estado inválido'),
        body('reason')
            .optional()
            .isLength({ max: 500 })
            .withMessage('La razón no puede exceder 500 caracteres'),
        body('metadata')
            .optional()
            .isJSON()
            .withMessage('El metadata debe ser JSON válido')
    ],
    agentStatusController.changeStatus
);

/**
 * @swagger
 * /api/agent/pause/start:
 *   post:
 *     summary: Iniciar pausa del agente
 *     tags: [Agent Status]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pauseType:
 *                 type: string
 *                 enum: [bathroom, lunch, break, coaching, system_issue, personal]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pausa iniciada correctamente
 */
router.post('/pause/start',
    asegurarAutenticacion,
    [
        body('pauseType')
            .isIn(['bathroom', 'lunch', 'break', 'coaching', 'system_issue', 'personal'])
            .withMessage('Tipo de pausa inválido'),
        body('reason')
            .optional()
            .isLength({ max: 500 })
            .withMessage('La razón no puede exceder 500 caracteres')
    ],
    agentStatusController.startPause
);

/**
 * @swagger
 * /api/agent/pause/end:
 *   post:
 *     summary: Finalizar pausa del agente
 *     tags: [Agent Status]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Pausa finalizada correctamente
 */
router.post('/pause/end',
    asegurarAutenticacion,
    agentStatusController.endPause
);

/**
 * @swagger
 * /api/agent/session/start:
 *   post:
 *     summary: Iniciar sesión de trabajo
 *     tags: [Agent Status]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               campaignId:
 *                 type: integer
 *                 description: ID de la campaña asignada
 *     responses:
 *       200:
 *         description: Sesión iniciada correctamente
 */
router.post('/session/start',
    asegurarAutenticacion,
    [
        body('campaignId')
            .optional()
            .isInt({ min: 1 })
            .withMessage('ID de campaña inválido')
    ],
    agentStatusController.startSession
);

/**
 * @swagger
 * /api/agent/session/end:
 *   post:
 *     summary: Finalizar sesión de trabajo
 *     tags: [Agent Status]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               callsHandled:
 *                 type: integer
 *               salesCount:
 *                 type: integer
 *               qualityScore:
 *                 type: number
 *               customerSatisfaction:
 *                 type: number
 *     responses:
 *       200:
 *         description: Sesión finalizada correctamente
 */
router.post('/session/end',
    asegurarAutenticacion,
    [
        body('callsHandled')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Número de llamadas inválido'),
        body('salesCount')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Número de ventas inválido'),
        body('qualityScore')
            .optional()
            .isFloat({ min: 0, max: 100 })
            .withMessage('Score de calidad inválido'),
        body('customerSatisfaction')
            .optional()
            .isFloat({ min: 0, max: 5 })
            .withMessage('Satisfacción del cliente inválida')
    ],
    agentStatusController.endSession
);

/**
 * @swagger
 * /api/agent/status/{agentId}:
 *   get:
 *     summary: Obtener estado actual del agente
 *     tags: [Agent Status]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: false
 *         schema:
 *           type: integer
 *         description: ID del agente (si no se proporciona, usa el usuario actual)
 *     responses:
 *       200:
 *         description: Estado actual del agente
 *       403:
 *         description: Acceso denegado
 */
// Ruta sin agentId (usa usuario actual)
router.get('/status',
    asegurarAutenticacion,
    agentStatusController.getCurrentStatus
);

// Ruta con agentId específico
router.get('/status/:agentId',
    asegurarAutenticacion,
    [
        param('agentId')
            .isInt({ min: 1 })
            .withMessage('ID de agente inválido')
    ],
    agentStatusController.getCurrentStatus
);

/**
 * @swagger
 * /api/agent/productivity/{agentId}:
 *   get:
 *     summary: Obtener métricas de productividad
 *     tags: [Agent Status]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: period
 *         required: false
 *         schema:
 *           type: string
 *           enum: [today, week, month]
 *           default: today
 *     responses:
 *       200:
 *         description: Métricas de productividad
 *       403:
 *         description: Acceso denegado
 */
// Productividad del usuario actual
router.get('/productivity',
    asegurarAutenticacion,
    [
        query('period')
            .optional()
            .isIn(['today', 'week', 'month'])
            .withMessage('Período inválido')
    ],
    agentStatusController.getProductivityMetrics
);

// Productividad de agente específico
router.get('/productivity/:agentId',
    asegurarAutenticacion,
    [
        param('agentId')
            .isInt({ min: 1 })
            .withMessage('ID de agente inválido'),
        query('period')
            .optional()
            .isIn(['today', 'week', 'month'])
            .withMessage('Período inválido')
    ],
    agentStatusController.getProductivityMetrics
);

/**
 * @swagger
 * /api/agent/realtime-metrics:
 *   get:
 *     summary: Obtener métricas en tiempo real (solo supervisores)
 *     tags: [Agent Status]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Métricas en tiempo real
 *       403:
 *         description: Acceso denegado
 */
router.get('/realtime-metrics',
    asegurarAutenticacion,
    ensureSupervisor,
    agentStatusController.getRealtimeMetrics
);

/**
 * @swagger
 * /api/agent/history/{agentId}:
 *   get:
 *     summary: Obtener historial de estados
 *     tags: [Agent Status]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: false
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Historial de estados
 *       403:
 *         description: Acceso denegado
 */
// Historial del usuario actual
router.get('/history',
    asegurarAutenticacion,
    [
        query('startDate')
            .optional()
            .isISO8601()
            .withMessage('Fecha de inicio inválida'),
        query('endDate')
            .optional()
            .isISO8601()
            .withMessage('Fecha de fin inválida'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 1000 })
            .withMessage('Límite inválido (1-1000)'),
        query('offset')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Offset inválido')
    ],
    agentStatusController.getStatusHistory
);

// Historial de agente específico
router.get('/history/:agentId',
    asegurarAutenticacion,
    [
        param('agentId')
            .isInt({ min: 1 })
            .withMessage('ID de agente inválido'),
        query('startDate')
            .optional()
            .isISO8601()
            .withMessage('Fecha de inicio inválida'),
        query('endDate')
            .optional()
            .isISO8601()
            .withMessage('Fecha de fin inválida'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 1000 })
            .withMessage('Límite inválido (1-1000)'),
        query('offset')
            .optional()
            .isInt({ min: 0 })
            .withMessage('Offset inválido')
    ],
    agentStatusController.getStatusHistory
);

/**
 * @swagger
 * /api/agent/metrics/current:
 *   get:
 *     summary: Obtener métricas actuales del agente desde Redis (tiempo real)
 *     tags: [Agent Status]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Métricas actuales en tiempo real
 */
// Métricas del usuario actual
router.get('/metrics/current',
    asegurarAutenticacion,
    agentStatusController.getCurrentMetrics
);

// Métricas de agente específico
router.get('/metrics/current/:agentId',
    asegurarAutenticacion,
    [
        param('agentId')
            .isInt({ min: 1 })
            .withMessage('ID de agente inválido')
    ],
    agentStatusController.getCurrentMetrics
);

/**
 * @swagger
 * /api/agent/session/active:
 *   get:
 *     summary: Obtener sesión activa para recuperación de estado (Sprint 2.2)
 *     tags: [Agent Status]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Sesión activa con métricas
 */
router.get('/session/active',
    asegurarAutenticacion,
    agentStatusController.getActiveSessionForRecovery
);

/**
 * @swagger
 * /api/agent/live-status:
 *   get:
 *     summary: Obtener estado en vivo para actualización de UI
 *     tags: [Agent Status]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Estado en vivo del agente
 */
router.get('/live-status',
    asegurarAutenticacion,
    agentStatusController.getLiveStatus
);

/**
 * @swagger
 * /api/agent/supervisor/dashboard:
 *   get:
 *     summary: Vista del dashboard de supervisor
 *     tags: [Supervisor]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Dashboard de supervisor
 *       403:
 *         description: Acceso denegado
 */
router.get('/supervisor/dashboard',
    asegurarAutenticacion,
    ensureSupervisor,
    agentStatusController.showSupervisorDashboard
);

/**
 * @swagger
 * /api/agent/supervisor/metrics:
 *   get:
 *     summary: Obtener métricas completas para dashboard de supervisor
 *     tags: [Supervisor]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Métricas completas del equipo
 *       403:
 *         description: Acceso denegado
 */
router.get('/supervisor/metrics',
    asegurarAutenticacion,
    ensureSupervisor,
    agentStatusController.getSupervisorMetrics
);

export default router;