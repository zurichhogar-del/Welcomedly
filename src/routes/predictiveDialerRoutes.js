import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { loginLimiter } from '../middlewares/securityMiddleware.js';
import { ensureAuthenticated, ensureSupervisor } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Import services (will be created in controllers)
import predictiveDialerService from '../services/predictiveDialerService.js';

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
router.use(ensureAuthenticated);
router.use(responseWrapper);

/**
 * @swagger
 * /api/dialer/campaigns:
 *   post:
 *     summary: Create predictive dialer campaign
 *     tags: [Predictive Dialer]
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
 *                 type: number
 *                 description: Campaign ID from BaseCampana
 *               agentIds:
 *                 type: array
 *                 items:
 *                   type: number
 *                 description: Array of agent IDs
 *               settings:
 *                 type: object
 *                 properties:
 *                   callRatio:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 5
 *                     description: Calls per agent ratio
 *                   amdDetection:
 *                     type: boolean
 *                     description: Enable answering machine detection
 *                   callTimeLimit:
 *                     type: number
 *                     description: Maximum call duration in seconds
 *                   retryAttempts:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 5
 *                     description: Maximum retry attempts
 *     responses:
 *       201:
 *         description: Campaign created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 campaign:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: number
 *                     campaignId:
 *                       type: number
 *                     callRatio:
 *                       type: number
 *                     status:
 *                       type: string
 *                       enum: [configuring, active, paused, completed, failed]
 *                     agentIds:
 *                       type: array
 *                       items:
 *                         type: number
 *       400:
 *         description: Invalid input or campaign creation failed
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/campaigns',
    loginLimiter,
    [
        body('campaignId')
            .isInt({ min: 1 })
            .withMessage('campaignId must be a positive integer'),
        body('agentIds')
            .isArray({ min: 1 })
            .withMessage('agentIds must be a non-empty array'),
        body('agentIds.*')
            .isInt({ min: 1 })
            .withMessage('Each agent ID must be a positive integer'),
        body('settings.callRatio')
            .optional()
            .isFloat({ min: 1, max: 5 })
            .withMessage('callRatio must be between 1 and 5'),
        body('settings.callTimeLimit')
            .optional()
            .isInt({ min: 30, max: 7200 })
            .withMessage('callTimeLimit must be between 30 seconds and 2 hours'),
        body('settings.retryAttempts')
            .optional()
            .isInt({ min: 1, max: 5 })
            .withMessage('retryAttempts must be between 1 and 5')
    ],
    validateRequest,
    ensureSupervisor,
    async (req, res) => {
        try {
            const campaign = await predictiveDialerService.createCampaign(req.body);
            res.status(201).json({
                success: true,
                campaign,
                message: 'Predictive dialer campaign created successfully'
            });
        } catch (error) {
            console.error('Error creating predictive dialer campaign:', error);
            res.status(error.message.includes('Required') ? 400 : 500).json({
                success: false,
                message: error.message || 'Failed to create campaign'
            });
        }
    }
);

/**
 * @swagger
 * /api/dialer/campaigns/{campaignId}/start:
 *   post:
 *     summary: Start predictive dialer campaign
 *     tags: [Predictive Dialer]
 *     security:
 *       - sessionAuth: []
 *       - supervisorAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: number
 *         description: Predictive dialer campaign ID
 *     responses:
 *       200:
 *         description: Campaign started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 campaign:
 *                   type: object
 *       400:
 *         description: Campaign not found or already active
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.post('/campaigns/:campaignId/start',
    loginLimiter,
    [
        query('campaignId')
            .isInt({ min: 1 })
            .withMessage('campaignId must be a positive integer')
    ],
    validateRequest,
    ensureSupervisor,
    async (req, res) => {
        try {
            const campaignId = parseInt(req.params.campaignId);
            const result = await predictiveDialerService.startCampaign(campaignId);
            res.json({
                success: true,
                message: 'Campaign started successfully',
                campaign: result.campaign
            });
        } catch (error) {
            console.error('Error starting campaign:', error);
            const statusCode = error.message.includes('not found') ? 404 :
                               error.message.includes('already') ? 400 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to start campaign'
            });
        }
    }
);

/**
 * @swagger
 * /api/dialer/campaigns/{campaignId}/pause:
 *   post:
 *     summary: Pause predictive dialer campaign
 *     tags: [Predictive Dialer]
 *     security:
 *       - sessionAuth: []
 *       - supervisorAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: number
 *         description: Predictive dialer campaign ID
 *     responses:
 *       200:
 *         description: Campaign paused successfully
 *       400:
 *         description: Campaign not found or not active
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.post('/campaigns/:campaignId/pause',
    loginLimiter,
    validateRequest,
    ensureSupervisor,
    async (req, res) => {
        try {
            const campaignId = parseInt(req.params.campaignId);
            const result = await predictiveDialerService.pauseCampaign(campaignId);
            res.json({
                success: true,
                message: 'Campaign paused successfully',
                campaign: result.campaign
            });
        } catch (error) {
            console.error('Error pausing campaign:', error);
            const statusCode = error.message.includes('not found') ? 404 :
                               error.message.includes('not active') ? 400 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to pause campaign'
            });
        }
    }
);

/**
 * @swagger
 * /api/dialer/campaigns/{campaignId}/resume:
 *   post:
 *     summary: Resume paused predictive dialer campaign
 *     tags: [Predictive Dialer]
 *     security:
 *       - sessionAuth: []
 *       - supervisorAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: number
 *         description: Predictive dialer campaign ID
 *     responses:
 *       200:
 *         description: Campaign resumed successfully
 *       400:
 *         description: Campaign not found or not paused
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.post('/campaigns/:campaignId/resume',
    loginLimiter,
    validateRequest,
    ensureSupervisor,
    async (req, res) => {
        try {
            const campaignId = parseInt(req.params.campaignId);
            const result = await predictiveDialerService.resumeCampaign(campaignId);
            res.json({
                success: true,
                message: 'Campaign resumed successfully',
                campaign: result.campaign
            });
        } catch (error) {
            console.error('Error resuming campaign:', error);
            const statusCode = error.message.includes('not found') ? 404 :
                               error.message.includes('not paused') ? 400 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to resume campaign'
            });
        }
    }
);

/**
 * @swagger
 * /api/dialer/campaigns/{campaignId}/stop:
 *   post:
 *     summary: Stop predictive dialer campaign
 *     tags: [Predictive Dialer]
 *     security:
 *       - sessionAuth: []
 *       - supervisorAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: number
 *         description: Predictive dialer campaign ID
 *     responses:
 *       200:
 *         description: Campaign stopped successfully
 *       400:
 *         description: Campaign not found or already stopped
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.post('/campaigns/:campaignId/stop',
    loginLimiter,
    validateRequest,
    ensureSupervisor,
    async (req, res) => {
        try {
            const campaignId = parseInt(req.params.campaignId);
            const result = await predictiveDialerService.stopCampaign(campaignId);
            res.json({
                success: true,
                message: 'Campaign stopped successfully',
                campaign: result.campaign
            });
        } catch (error) {
            console.error('Error stopping campaign:', error);
            const statusCode = error.message.includes('not found') ? 404 :
                               error.message.includes('already') ? 400 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to stop campaign'
            });
        }
    }
);

/**
 * @swagger
 * /api/dialer/campaigns:
 *   get:
 *     summary: Get all predictive dialer campaigns
 *     tags: [Predictive Dialer]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: List of campaigns retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 campaigns:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                       campaignId:
 *                         type: number
 *                       status:
 *                         type: string
 *                       agentIds:
 *                         type: array
 *                         items:
 *                           type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/campaigns',
    loginLimiter,
    async (req, res) => {
        try {
            const campaigns = await predictiveDialerService.getCampaigns();
            res.json({
                success: true,
                campaigns
            });
        } catch (error) {
            console.error('Error fetching campaigns:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch campaigns'
            });
        }
    }
);

/**
 * @swagger
 * /api/dialer/campaigns/{campaignId}/status:
 *   get:
 *     summary: Get campaign status and statistics
 *     tags: [Predictive Dialer]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: campaignId
 *         required: true
 *         schema:
 *           type: number
 *         description: Predictive dialer campaign ID
 *     responses:
 *       200:
 *         description: Campaign status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 campaign:
 *                   type: object
 *                 statistics:
 *                   type: object
 *       404:
 *         description: Campaign not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/campaigns/:campaignId/status',
    loginLimiter,
    async (req, res) => {
        try {
            const campaignId = parseInt(req.params.campaignId);
            const status = await predictiveDialerService.getCampaignStatus(campaignId);
            res.json({
                success: true,
                campaign: status.campaign,
                statistics: status.statistics
            });
        } catch (error) {
            console.error('Error fetching campaign status:', error);
            const statusCode = error.message.includes('not found') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to fetch campaign status'
            });
        }
    }
);

/**
 * @swagger
 * /api/dialer/calls/assign:
 *   post:
 *     summary: Assign call to available agent
 *     tags: [Predictive Dialer]
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
 *                 type: number
 *               priority:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10
 *                 description: Call priority (1-10, higher is more urgent)
 *               metadata:
 *                 type: object
 *                 description: Additional call metadata
 *     responses:
 *       200:
 *         description: Call assigned successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 assignment:
 *                   type: object
 *                   properties:
 *                     agentId:
 *                       type: number
 *                     recordId:
 *                       type: number
 *                     phoneNumber:
 *                       type: string
 *                     campaignId:
 *                       type: number
 *       400:
 *         description: No agents available or campaign not active
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/calls/assign',
    loginLimiter,
    [
        body('campaignId')
            .isInt({ min: 1 })
            .withMessage('campaignId must be a positive integer'),
        body('priority')
            .optional()
            .isInt({ min: 1, max: 10 })
            .withMessage('priority must be between 1 and 10')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { campaignId, priority = 5, metadata = {} } = req.body;
            const assignment = await predictiveDialerService.assignCallToAgent(campaignId, priority, metadata);
            res.json({
                success: true,
                assignment,
                message: 'Call assigned successfully'
            });
        } catch (error) {
            console.error('Error assigning call:', error);
            const statusCode = error.message.includes('No agents available') ||
                               error.message.includes('No eligible records') ? 400 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to assign call'
            });
        }
    }
);

/**
 * @swagger
 * /api/dialer/calls/{callId}/complete:
 *   post:
 *     summary: Mark call as completed and update statistics
 *     tags: [Predictive Dialer]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: callId
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique call identifier
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
 *               duration:
 *                 type: number
 *                 minimum: 1
 *                 description: Call duration in seconds
 *               disposition:
 *                 type: string
 *                 enum: [answered, busy, no_answer, amd, failed]
 *                 description: Final call disposition
 *               outcome:
 *                 type: string
 *                 description: Call outcome (e.g., sale, follow_up, not_interested)
 *     responses:
 *       200:
 *         description: Call completed successfully
 *       400:
 *         description: Invalid input or call assignment not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/calls/:callId/complete',
    loginLimiter,
    [
        body('agentId')
            .isInt({ min: 1 })
            .withMessage('agentId must be a positive integer'),
        body('duration')
            .isInt({ min: 1 })
            .withMessage('duration must be a positive integer'),
        body('disposition')
            .isIn(['answered', 'busy', 'no_answer', 'amd', 'failed'])
            .withMessage('Invalid disposition value')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const callId = req.params.callId;
            const { agentId, duration, disposition, outcome } = req.body;

            await predictiveDialerService.completeCall(callId, agentId, duration, disposition, outcome);

            res.json({
                success: true,
                message: 'Call completed successfully'
            });
        } catch (error) {
            console.error('Error completing call:', error);
            const statusCode = error.message.includes('not found') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to complete call'
            });
        }
    }
);

/**
 * @swagger
 * /api/dialer/agents/{agentId}/status:
 *   get:
 *     summary: Get agent's current call status
 *     tags: [Predictive Dialer]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: number
 *         description: Agent ID
 *     responses:
 *       200:
 *         description: Agent status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: object
 *                   properties:
 *                     agentId:
 *                       type: number
 *                     status:
 *                       type: string
 *                       enum: [available, busy, offline]
 *                     currentCall:
 *                       type: object
 *                     totalCallsToday:
 *                       type: number
 *                     averageCallDuration:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/agents/:agentId/status',
    loginLimiter,
    async (req, res) => {
        try {
            const agentId = parseInt(req.params.agentId);
            const status = await predictiveDialerService.getAgentStatus(agentId);
            res.json({
                success: true,
                status
            });
        } catch (error) {
            console.error('Error fetching agent status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch agent status'
            });
        }
    }
);

/**
 * @swagger
 * /api/dialer/performance:
 *   get:
 *     summary: Get predictive dialer performance metrics
 *     tags: [Predictive Dialer]
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: Performance metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 metrics:
 *                   type: object
 *                   properties:
 *                     agentUtilization:
 *                       type: number
 *                     callConnectionRate:
 *                       type: number
 *                     averageWaitTime:
 *                       type: number
 *                     averageCallDuration:
 *                       type: number
 *                     droppedCallsRate:
 *                       type: number
 *                     amdAccuracy:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/performance',
    loginLimiter,
    async (req, res) => {
        try {
            const metrics = await predictiveDialerService.getPerformanceMetrics();
            res.json({
                success: true,
                metrics
            });
        } catch (error) {
            console.error('Error fetching performance metrics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch performance metrics'
            });
        }
    }
);

/**
 * @swagger
 * /api/dialer/settings/optimize:
 *   post:
 *     summary: Optimize dialer settings using ML
 *     tags: [Predictive Dialer]
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
 *               campaignId:
 *                 type: number
 *                 description: Campaign ID to optimize settings for
 *               timeWindow:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 24
 *                 description: Time window in hours for analysis
 *     responses:
 *       200:
 *         description: Settings optimized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 optimizedSettings:
 *                   type: object
 *                   properties:
 *                     callRatio:
 *                       type: number
 *                     redialTime:
 *                       type: number
 *                     AMD:
 *                       type: object
 *                       properties:
 *                         silenceThreshold:
 *                           type: number
 *                         voiceThreshold:
 *                           type: number
 *               improvement:
 *                 type: object
 *                 properties:
 *                   expectedIncrease:
 *                     type: number
 *                   confidence:
 *                     type: number
 *       400:
 *         description: Insufficient data for optimization
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.post('/settings/optimize',
    loginLimiter,
    ensureSupervisor,
    [
        body('campaignId')
            .isInt({ min: 1 })
            .withMessage('campaignId must be a positive integer'),
        body('timeWindow')
            .optional()
            .isFloat({ min: 1, max: 24 })
            .withMessage('timeWindow must be between 1 and 24 hours')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { campaignId, timeWindow = 24 } = req.body;
            const optimized = await predictiveDialerService.optimizeSettings(campaignId, timeWindow);
            res.json({
                success: true,
                optimizedSettings: optimized.settings,
                improvement: optimized.improvement,
                message: 'Settings optimized successfully'
            });
        } catch (error) {
            console.error('Error optimizing settings:', error);
            const statusCode = error.message.includes('Insufficient data') ? 400 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to optimize settings'
            });
        }
    }
);

export default router;