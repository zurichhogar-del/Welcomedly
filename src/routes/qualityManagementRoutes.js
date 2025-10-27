import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { loginLimiter } from '../middlewares/securityMiddleware.js';
import { asegurarAutenticacion, ensureSupervisor } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Import services
import qualityManagementService from '../services/qualityManagementService.js';

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
 * /api/quality/calls/analyze:
 *   post:
 *     summary: Perform complete call quality analysis
 *     tags: [Quality Management]
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
 *               agentId:
 *                 type: number
 *                 description: Agent ID who handled the call
 *               callId:
 *                 type: string
 *                 description: Unique call identifier
 *               duration:
 *                 type: number
 *                 minimum: 1
 *                 description: Call duration in seconds
 *               transcript:
 *                 type: string
 *                 description: Full call transcript
 *               recordingUrl:
 *                 type: string
 *                 description: URL to call recording
 *               metadata:
 *                 type: object
 *                 description: Additional call metadata
 *               manualQuality:
 *                 type: object
 *                 properties:
 *                   score:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 100
 *                   notes:
 *                     type: string
 *                   evaluator:
 *                     type: string
 *                 description: Manual quality evaluation (optional)
 *     responses:
 *       200:
 *         description: Quality analysis completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 analysis:
 *                   type: object
 *                   properties:
 *                     callId:
 *                       type: string
 *                     agentId:
 *                       type: number
 *                     overallScore:
 *                       type: number
 *                     speech:
 *                       type: object
 *                     quality:
 *                       type: object
 *                     compliance:
 *                       type: object
 *                     timestamp:
 *                       type: string
 *                 coaching:
 *                   type: object
 *                   properties:
 *                     insights:
 *                       type: array
 *                     actionItems:
 *                       type: array
 *                     learningResources:
 *                       type: array
 *       400:
 *         description: Invalid input or analysis failed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.post('/calls/analyze',
    loginLimiter,
    [
        body('agentId')
            .isInt({ min: 1 })
            .withMessage('agentId must be a positive integer'),
        body('callId')
            .isString()
            .notEmpty()
            .withMessage('callId is required'),
        body('duration')
            .isInt({ min: 1 })
            .withMessage('duration must be a positive integer'),
        body('transcript')
            .optional()
            .isString()
            .withMessage('transcript must be a string'),
        body('recordingUrl')
            .optional()
            .isURL()
            .withMessage('recordingUrl must be a valid URL'),
        body('manualQuality.score')
            .optional()
            .isFloat({ min: 0, max: 100 })
            .withMessage('manualQuality.score must be between 0 and 100')
    ],
    validateRequest,
    ensureSupervisor,
    async (req, res) => {
        try {
            const analysis = await qualityManagementService.analyzeCall(req.body);
            res.json({
                success: true,
                analysis,
                message: 'Call quality analysis completed successfully'
            });
        } catch (error) {
            console.error('Error analyzing call quality:', error);
            const statusCode = error.message.includes('Required') ? 400 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to analyze call quality'
            });
        }
    }
);

/**
 * @swagger
 * /api/quality/realtime/analyze:
 *   post:
 *     summary: Perform real-time call analysis
 *     tags: [Quality Management]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               callId:
 *                 type: string
 *                 description: Unique call identifier
 *               agentId:
 *                 type: number
 *                 description: Agent ID
 *               audioSegment:
 *                 type: string
 *                 description: Base64 encoded audio segment
 *               isAgent:
 *                 type: boolean
 *                 description: Whether audio is from agent
 *     responses:
 *       200:
 *         description: Real-time analysis completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 analysis:
 *                   type: object
 *                   properties:
 *                     sentiment:
 *                       type: object
 *                       properties:
 *                         score:
 *                           type: number
 *                         confidence:
 *                           type: number
 *                         label:
 *                           type: string
 *                     keywords:
 *                       type: array
 *                       items:
 *                         type: string
 *                     compliance:
 *                       type: object
 *                       properties:
 *                         violations:
 *                           type: array
 *                           items:
 *                             type: string
 *                         score:
 *                           type: number
 *                     suggestions:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/realtime/analyze',
    loginLimiter,
    [
        body('callId')
            .isString()
            .notEmpty()
            .withMessage('callId is required'),
        body('agentId')
            .isInt({ min: 1 })
            .withMessage('agentId must be a positive integer'),
        body('audioSegment')
            .isString()
            .notEmpty()
            .withMessage('audioSegment is required'),
        body('isAgent')
            .isBoolean()
            .withMessage('isAgent must be a boolean')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { callId, agentId, audioSegment, isAgent } = req.body;
            const analysis = await qualityManagementService.analyzeCallRealtime(
                callId, agentId, audioSegment, isAgent
            );
            res.json({
                success: true,
                analysis
            });
        } catch (error) {
            console.error('Error in real-time analysis:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Real-time analysis failed'
            });
        }
    }
);

/**
 * @swagger
 * /api/quality/calls/{callId}/history:
 *   get:
 *     summary: Get call analysis history
 *     tags: [Quality Management]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: callId
 *         required: true
 *         schema:
 *           type: string
 *         description: Call identifier
 *     responses:
 *       200:
 *         description: Call history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 history:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       timestamp:
 *                         type: string
 *                       segment:
 *                         type: string
 *                       sentiment:
 *                         type: object
 *                       keywords:
 *                         type: array
 *                         items:
 *                           type: string
 *                       compliance:
 *                         type: object
 *       404:
 *         description: No analysis history found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/calls/:callId/history',
    loginLimiter,
    async (req, res) => {
        try {
            const callId = req.params.callId;
            const history = await qualityManagementService.getCallAnalysisHistory(callId);
            res.json({
                success: true,
                history
            });
        } catch (error) {
            console.error('Error fetching call analysis history:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch call analysis history'
            });
        }
    }
);

/**
 * @swagger
 * /api/quality/agents/{agentId}/performance:
 *   get:
 *     summary: Get agent quality performance
 *     tags: [Quality Management]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: number
 *         description: Agent ID
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [day, week, month, quarter]
 *           default: month
 *         description: Time range for performance data
 *     responses:
 *       200:
 *         description: Agent performance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 performance:
 *                   type: object
 *                   properties:
 *                     agentId:
 *                       type: number
 *                     timeRange:
 *                       type: string
 *                     totalCalls:
 *                       type: number
 *                     averageScore:
 *                       type: number
 *                     trend:
 *                       type: string
 *                       enum: [improving, declining, stable]
 *                     areas:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           area:
 *                             type: string
 *                           score:
 *                             type: number
 *                           trend:
 *                             type: string
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/agents/:agentId/performance',
    loginLimiter,
    [
        query('timeRange')
            .optional()
            .isIn(['day', 'week', 'month', 'quarter'])
            .withMessage('timeRange must be one of: day, week, month, quarter')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const agentId = parseInt(req.params.agentId);
            const timeRange = req.query.timeRange || 'month';
            const performance = await qualityManagementService.getAgentPerformance(agentId, timeRange);
            res.json({
                success: true,
                performance
            });
        } catch (error) {
            console.error('Error fetching agent performance:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch agent performance'
            });
        }
    }
);

/**
 * @swagger
 * /api/quality/team/performance:
 *   get:
 *     summary: Get team quality performance
 *     tags: [Quality Management]
 *     security:
 *       - sessionAuth: []
 *       - supervisorAuth: []
 *     responses:
 *       200:
 *         description: Team performance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 performance:
 *                   type: object
 *                   properties:
 *                     averageScore:
 *                       type: number
 *                     totalAgents:
 *                       type: number
 *                     topPerformers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           agentId:
 *                             type: number
 *                           score:
 *                             type: number
 *                     improvementAreas:
 *                       type: array
 *                       items:
 *                         type: string
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
router.get('/team/performance',
    loginLimiter,
    ensureSupervisor,
    async (req, res) => {
        try {
            const performance = await qualityManagementService.getTeamPerformance();
            res.json({
                success: true,
                performance
            });
        } catch (error) {
            console.error('Error fetching team performance:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch team performance'
            });
        }
    }
);

/**
 * @swagger
 * /api/quality/compliance/report:
 *   get:
 *     summary: Get compliance report
 *     tags: [Quality Management]
 *     security:
 *       - sessionAuth: []
 *       - supervisorAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [day, week, month, quarter]
 *           default: month
 *         description: Time range for report
 *       - in: query
 *         name: agentId
 *         schema:
 *           type: number
 *         description: Filter by specific agent
 *     responses:
 *       200:
 *         description: Compliance report generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 report:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalCalls:
 *                           type: number
 *                         compliantCalls:
 *                           type: number
 *                         complianceRate:
 *                           type: number
 *                     violations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           type:
 *                             type: string
 *                           count:
 *                             type: number
 *                           severity:
 *                             type: string
 *                           examples:
 *                             type: array
 *                             items:
 *                               type: string
 *                     trends:
 *                       type: object
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
router.get('/compliance/report',
    loginLimiter,
    ensureSupervisor,
    [
        query('timeRange')
            .optional()
            .isIn(['day', 'week', 'month', 'quarter'])
            .withMessage('timeRange must be one of: day, week, month, quarter'),
        query('agentId')
            .optional()
            .isInt({ min: 1 })
            .withMessage('agentId must be a positive integer')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const timeRange = req.query.timeRange || 'month';
            const agentId = req.query.agentId ? parseInt(req.query.agentId) : null;
            const report = await qualityManagementService.getComplianceReport(timeRange, agentId);
            res.json({
                success: true,
                report
            });
        } catch (error) {
            console.error('Error generating compliance report:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to generate compliance report'
            });
        }
    }
);

/**
 * @swagger
 * /api/quality/coaching/insights:
 *   get:
 *     summary: Get coaching insights for agents
 *     tags: [Quality Management]
 *     security:
 *       - sessionAuth: []
 *       - supervisorAuth: []
 *     parameters:
 *       - in: query
 *         name: agentId
 *         schema:
 *           type: number
 *         description: Filter by specific agent
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [all, high_priority, medium_priority, low_priority]
 *           default: all
 *         description: Filter by insight category
 *     responses:
 *       200:
 *         description: Coaching insights retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 insights:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       agentId:
 *                         type: number
 *                       priority:
 *                         type: string
 *                         enum: [high, medium, low]
 *                       category:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       recommendation:
 *                         type: string
 *                       estimatedImprovement:
 *                         type: number
 *                       level:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.get('/coaching/insights',
    loginLimiter,
    ensureSupervisor,
    [
        query('agentId')
            .optional()
            .isInt({ min: 1 })
            .withMessage('agentId must be a positive integer'),
        query('category')
            .optional()
            .isIn(['all', 'high_priority', 'medium_priority', 'low_priority'])
            .withMessage('category must be one of: all, high_priority, medium_priority, low_priority')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const agentId = req.query.agentId ? parseInt(req.query.agentId) : null;
            const category = req.query.category || 'all';
            const insights = await qualityManagementService.getCoachingInsights(agentId, category);
            res.json({
                success: true,
                insights
            });
        } catch (error) {
            console.error('Error fetching coaching insights:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch coaching insights'
            });
        }
    }
);

/**
 * @swagger
 * /api/quality/templates:
 *   get:
 *     summary: Get evaluation templates
 *     tags: [Quality Management]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Templates retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 templates:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                       criteria:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             category:
 *                               type: string
 *                             weight:
 *                               type: number
 *                             description:
 *                               type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/templates',
    loginLimiter,
    async (req, res) => {
        try {
            const templates = await qualityManagementService.getEvaluationTemplates();
            res.json({
                success: true,
                templates
            });
        } catch (error) {
            console.error('Error fetching evaluation templates:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch evaluation templates'
            });
        }
    }
);

/**
 * @swagger
 * /api/quality/benchmarks:
 *   get:
 *     summary: Get quality benchmarks
 *     tags: [Quality Management]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Benchmarks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 benchmarks:
 *                   type: object
 *                   properties:
 *                     overall:
 *                       type: object
 *                       properties:
 *                         average:
 *                           type: number
 *                         topQuartile:
 *                           type: number
 *                         bottomQuartile:
 *                           type: number
 *                     byCategory:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           category:
 *                             type: string
 *                             average:
 *                               type: number
 *                             topQuartile:
 *                               type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/benchmarks',
    loginLimiter,
    async (req, res) => {
        try {
            const benchmarks = await qualityManagementService.getQualityBenchmarks();
            res.json({
                success: true,
                benchmarks
            });
        } catch (error) {
            console.error('Error fetching quality benchmarks:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch quality benchmarks'
            });
        }
    }
);

export default router;