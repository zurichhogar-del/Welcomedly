import express from 'express';
import { query, validationResult } from 'express-validator';
import { loginLimiter } from '../middlewares/securityMiddleware.js';
import { asegurarAutenticacion, ensureSupervisor } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Import services
import advancedAnalyticsService from '../services/advancedAnalyticsService.js';

// Middleware for validation
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array(),
            message: 'Datos inválidos'
        });
    }
    next();
};

// Middleware para asegurar estructura de respuesta consistente
const responseWrapper = (req, res, next) => {
    const originalJson = res.json;

    res.json = function(data) {
        // Si la respuesta no tiene la propiedad success, añadirla
        // success boolean true response structure
        if (data && typeof data === 'object' && !('success' in data)) {
            data.success = true;
        }
        return originalJson.call(this, data);
    };

    next();
};

// Middleware to protect all routes
router.use(asegurarAutenticacion);
router.use(responseWrapper);

/**
 * @swagger
 * /api/analytics/realtime/overview:
 *   get:
 *     summary: Get real-time operational overview
 *     tags: [Advanced Analytics]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Real-time overview retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 overview:
 *                   type: object
 *                   properties:
 *                     agents:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         available:
 *                           type: number
 *                         inCall:
 *                           type: number
 *                         onBreak:
 *                           type: number
 *                     calls:
 *                       type: object
 *                       properties:
 *                         active:
 *                           type: number
 *                         completed:
 *                           type: number
 *                         abandoned:
 *                           type: number
 *                         averageWaitTime:
 *                           type: number
 *                     kpis:
 *                       type: object
 *                       properties:
 *                         serviceLevel:
 *                           type: number
 *                         occupancy:
 *                           type: number
 *                         adherence:
 *                           type: number
 *                     timestamp:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/realtime/overview',
    loginLimiter,
    async (req, res) => {
        try {
            const overview = await advancedAnalyticsService.getRealtimeOverview();
            res.json({
                success: true,
                overview
            });
        } catch (error) {
            console.error('Error fetching real-time overview:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch real-time overview'
            });
        }
    }
);

/**
 * @swagger
 * /api/analytics/realtime/dashboard:
 *   get:
 *     summary: Get real-time dashboard data
 *     tags: [Advanced Analytics]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Real-time dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 dashboard:
 *                   type: object
 *                   properties:
 *                     currentStatus:
 *                       type: object
 *                     liveMetrics:
 *                       type: object
 *                     activeAlerts:
 *                       type: array
 *                       items:
 *                         type: object
 *                     performance:
 *                       type: object
 *                     lastUpdated:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/realtime/dashboard',
    loginLimiter,
    async (req, res) => {
        try {
            const dashboard = await advancedAnalyticsService.getRealtimeDashboard();
            res.json({
                success: true,
                dashboard
            });
        } catch (error) {
            console.error('Error fetching real-time dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch real-time dashboard'
            });
        }
    }
);

/**
 * @swagger
 * /api/analytics/performance/agent:
 *   get:
 *     summary: Get agent performance analytics
 *     tags: [Advanced Analytics]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: agentId
 *         schema:
 *           type: number
 *         description: Filter by specific agent
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [hour, day, week, month, quarter]
 *           default: day
 *         description: Time range for analytics
 *       - in: query
 *         name: granularity
 *         schema:
 *           type: string
 *           enum: [minute, hour, day]
 *           default: hour
 *         description: Data granularity
 *     responses:
 *       200:
 *         description: Agent performance analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 analytics:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                     trends:
 *                       type: object
 *                     metrics:
 *                       type: array
 *                       items:
 *                         type: object
 *                     insights:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/performance/agent',
    loginLimiter,
    [
        query('agentId')
            .optional()
            .isInt({ min: 1 })
            .withMessage('agentId must be a positive integer'),
        query('timeRange')
            .optional()
            .isIn(['hour', 'day', 'week', 'month', 'quarter'])
            .withMessage('timeRange must be one of: hour, day, week, month, quarter'),
        query('granularity')
            .optional()
            .isIn(['minute', 'hour', 'day'])
            .withMessage('granularity must be one of: minute, hour, day')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const agentId = req.query.agentId ? parseInt(req.query.agentId) : null;
            const timeRange = req.query.timeRange || 'day';
            const granularity = req.query.granularity || 'hour';

            const analytics = await advancedAnalyticsService.getAgentPerformanceAnalytics(
                agentId, timeRange, granularity
            );
            res.json({
                success: true,
                analytics
            });
        } catch (error) {
            console.error('Error fetching agent performance analytics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch agent performance analytics'
            });
        }
    }
);

/**
 * @swagger
 * /api/analytics/performance/campaign:
 *   get:
 *     summary: Get campaign performance analytics
 *     tags: [Advanced Analytics]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: campaignId
 *         schema:
 *           type: number
 *         description: Filter by specific campaign
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [hour, day, week, month, quarter]
 *           default: day
 *         description: Time range for analytics
 *     responses:
 *       200:
 *         description: Campaign performance analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 analytics:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                     conversion:
 *                       type: object
 *                     trends:
 *                       type: object
 *                     insights:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/performance/campaign',
    loginLimiter,
    [
        query('campaignId')
            .optional()
            .isInt({ min: 1 })
            .withMessage('campaignId must be a positive integer'),
        query('timeRange')
            .optional()
            .isIn(['hour', 'day', 'week', 'month', 'quarter'])
            .withMessage('timeRange must be one of: hour, day, week, month, quarter')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const campaignId = req.query.campaignId ? parseInt(req.query.campaignId) : null;
            const timeRange = req.query.timeRange || 'day';

            const analytics = await advancedAnalyticsService.getCampaignPerformanceAnalytics(
                campaignId, timeRange
            );
            res.json({
                success: true,
                analytics
            });
        } catch (error) {
            console.error('Error fetching campaign performance analytics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch campaign performance analytics'
            });
        }
    }
);

/**
 * @swagger
 * /api/analytics/operational/overview:
 *   get:
 *     summary: Get operational analytics overview
 *     tags: [Advanced Analytics]
 *     security:
 *       - sessionAuth: []
 *       - supervisorAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [hour, day, week, month, quarter]
 *           default: day
 *         description: Time range for analytics
 *     responses:
 *       200:
 *         description: Operational analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 analytics:
 *                   type: object
 *                   properties:
 *                     agentPerformance:
 *                       type: object
 *                     callMetrics:
 *                       type: object
 *                     timeAnalysis:
 *                       type: object
 *                     trends:
 *                       type: object
 *                     insights:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.get('/operational/overview',
    loginLimiter,
    ensureSupervisor,
    [
        query('timeRange')
            .optional()
            .isIn(['hour', 'day', 'week', 'month', 'quarter'])
            .withMessage('timeRange must be one of: hour, day, week, month, quarter')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const timeRange = req.query.timeRange || 'day';
            const analytics = await advancedAnalyticsService.getOperationalAnalytics(timeRange);
            res.json({
                success: true,
                analytics
            });
        } catch (error) {
            console.error('Error fetching operational analytics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch operational analytics'
            });
        }
    }
);

/**
 * @swagger
 * /api/analytics/executive/overview:
 *   get:
 *     summary: Get executive dashboard overview
 *     tags: [Advanced Analytics]
 *     security:
 *       - sessionAuth: []
 *       - supervisorAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year]
 *           default: month
 *         description: Time range for dashboard
 *     responses:
 *       200:
 *         description: Executive overview retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 overview:
 *                   type: object
 *                   properties:
 *                     keyMetrics:
 *                       type: object
 *                       properties:
 *                         revenue:
 *                           type: object
 *                         costs:
 *                           type: object
 *                         profit:
 *                           type: object
 *                     performance:
 *                       type: object
 *                       properties:
 *                         agents:
 *                           type: object
 *                         campaigns:
 *                           type: object
 *                         quality:
 *                           type: object
 *                     trends:
 *                       type: object
 *                     insights:
 *                       type: array
 *                       items:
 *                         type: object
 *                     forecasts:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.get('/executive/overview',
    loginLimiter,
    ensureSupervisor,
    [
        query('timeRange')
            .optional()
            .isIn(['week', 'month', 'quarter', 'year'])
            .withMessage('timeRange must be one of: week, month, quarter, year')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const timeRange = req.query.timeRange || 'month';
            const overview = await advancedAnalyticsService.getExecutiveOverview(timeRange);
            res.json({
                success: true,
                overview
            });
        } catch (error) {
            console.error('Error fetching executive overview:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch executive overview'
            });
        }
    }
);

/**
 * @swagger
 * /api/analytics/revenue/overview:
 *   get:
 *     summary: Get revenue analytics overview
 *     tags: [Advanced Analytics]
 *     security:
 *       - sessionAuth: []
 *       - supervisorAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [week, month, quarter, year]
 *           default: month
 *         description: Time range for analytics
 *     responses:
 *       200:
 *         description: Revenue analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 analytics:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         growth:
 *                           type: number
 *                         forecast:
 *                           type: number
 *                     breakdown:
 *                       type: object
 *                     trends:
 *                       type: object
 *                     predictions:
 *                       type: object
 *                     insights:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.get('/revenue/overview',
    loginLimiter,
    ensureSupervisor,
    [
        query('timeRange')
            .optional()
            .isIn(['week', 'month', 'quarter', 'year'])
            .withMessage('timeRange must be one of: week, month, quarter, year')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const timeRange = req.query.timeRange || 'month';
            const analytics = await advancedAnalyticsService.getRevenueAnalytics(timeRange);
            res.json({
                success: true,
                analytics
            });
        } catch (error) {
            console.error('Error fetching revenue analytics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch revenue analytics'
            });
        }
    }
);

/**
 * @swagger
 * /api/analytics/comparative:
 *   get:
 *     summary: Get comparative analytics
 *     tags: [Advanced Analytics]
 *     security:
 *       - sessionAuth: []
 *       - supervisorAuth: []
 *     parameters:
 *       - in: query
 *         name: metric
 *         schema:
 *           type: string
 *           enum: [conversion_rate, call_volume, agent_performance, revenue, quality_score]
 *         description: Metric to compare
 *       - in: query
 *         name: dimension
 *         schema:
 *           type: string
 *           enum: [agents, campaigns, time, disposition]
 *         description: Comparison dimension
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [day, week, month, quarter]
 *           default: month
 *         description: Time range for comparison
 *     responses:
 *       200:
 *         description: Comparative analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 comparison:
 *                   type: object
 *                   properties:
 *                     metric:
 *                       type: string
 *                     dimension:
 *                       type: string
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                     insights:
 *                       type: array
 *                       items:
 *                         type: object
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.get('/comparative',
    loginLimiter,
    ensureSupervisor,
    [
        query('metric')
            .isIn(['conversion_rate', 'call_volume', 'agent_performance', 'revenue', 'quality_score'])
            .withMessage('Invalid metric'),
        query('dimension')
            .isIn(['agents', 'campaigns', 'time', 'disposition'])
            .withMessage('Invalid dimension'),
        query('timeRange')
            .optional()
            .isIn(['day', 'week', 'month', 'quarter'])
            .withMessage('timeRange must be one of: day, week, month, quarter')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { metric, dimension } = req.query;
            const timeRange = req.query.timeRange || 'month';
            const comparison = await advancedAnalyticsService.getComparativeAnalytics(
                metric, dimension, timeRange
            );
            res.json({
                success: true,
                comparison
            });
        } catch (error) {
            console.error('Error fetching comparative analytics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch comparative analytics'
            });
        }
    }
);

/**
 * @swagger
 * /api/analytics/predictive/insights:
 *   get:
 *     summary: Get predictive insights
 *     tags: [Advanced Analytics]
 *     security:
 *       - sessionAuth: []
 *       - supervisorAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [agent_performance, campaign_success, call_volume, quality_trends]
 *         description: Type of predictive insights
 *     responses:
 *       200:
 *         description: Predictive insights retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 insights:
 *                   type: object
 *                   properties:
 *                     predictions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           metric:
 *                             type: string
 *                           prediction:
 *                             type: number
 *                           confidence:
 *                             type: number
 *                           timeframe:
 *                             type: string
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: object
 *                     alerts:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.get('/predictive/insights',
    loginLimiter,
    ensureSupervisor,
    [
        query('type')
            .optional()
            .isIn(['agent_performance', 'campaign_success', 'call_volume', 'quality_trends'])
            .withMessage('Invalid insight type')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const type = req.query.type;
            const insights = await advancedAnalyticsService.getPredictiveInsights(type);
            res.json({
                success: true,
                insights
            });
        } catch (error) {
            console.error('Error fetching predictive insights:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch predictive insights'
            });
        }
    }
);

/**
 * @swagger
 * /api/analytics/alerts:
 *   get:
 *     summary: Get performance alerts
 *     tags: [Advanced Analytics]
 *     security:
 *       - sessionAuth: []
 *       - supervisorAuth: []
 *     parameters:
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [critical, warning, info]
 *         description: Filter by alert severity
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, resolved, dismissed]
 *         description: Filter by alert status
 *     responses:
 *       200:
 *         description: Performance alerts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 alerts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                       severity:
 *                         type: string
 *                       message:
 *                         type: string
 *                       metric:
 *                         type: string
 *                       value:
 *                         type: number
 *                       threshold:
 *                         type: number
 *                       timestamp:
 *                         type: string
 *                       status:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.get('/alerts',
    loginLimiter,
    ensureSupervisor,
    [
        query('severity')
            .optional()
            .isIn(['critical', 'warning', 'info'])
            .withMessage('Invalid severity'),
        query('status')
            .optional()
            .isIn(['active', 'resolved', 'dismissed'])
            .withMessage('Invalid status')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const severity = req.query.severity;
            const status = req.query.status;
            const alerts = await advancedAnalyticsService.getPerformanceAlerts(severity, status);
            res.json({
                success: true,
                alerts
            });
        } catch (error) {
            console.error('Error fetching performance alerts:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch performance alerts'
            });
        }
    }
);

/**
 * @swagger
 * /api/analytics/export:
 *   post:
 *     summary: Export analytics data
 *     tags: [Advanced Analytics]
 *     security:
 *       - sessionAuth: []
 *       - supervisorAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reportType:
 *                 type: string
 *                 enum: [agent_performance, campaign_performance, operational, executive]
 *                 description: Type of report to export
 *               timeRange:
 *                 type: string
 *                 enum: [day, week, month, quarter]
 *                 description: Time range for data
 *               filters:
 *                 type: object
 *                 description: Additional filters
 *               format:
 *                 type: string
 *                 enum: [json, csv, pdf]
 *                 default: json
 *                 description: Export format
 *     responses:
 *       200:
 *         description: Data exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 exportId:
 *                   type: string
 *                 downloadUrl:
 *                   type: string
 *                 format:
 *                   type: string
 *                 expiresAt:
 *                   type: string
 *       400:
 *         description: Invalid export parameters
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.post('/export',
    loginLimiter,
    ensureSupervisor,
    [
        // Validation would be added here for request body
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { reportType, timeRange, filters, format } = req.body;
            const exportData = await advancedAnalyticsService.exportAnalyticsData(
                reportType, timeRange, filters, format
            );
            res.json({
                success: true,
                exportId: exportData.exportId,
                downloadUrl: exportData.downloadUrl,
                format: exportData.format,
                expiresAt: exportData.expiresAt,
                message: 'Export created successfully'
            });
        } catch (error) {
            console.error('Error exporting analytics data:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to export analytics data'
            });
        }
    }
);

export default router;