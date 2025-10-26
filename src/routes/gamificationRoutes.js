import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { loginLimiter } from '../middlewares/securityMiddleware.js';
import { ensureAuthenticated, ensureSupervisor } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Import services
import gamificationService from '../services/gamificationService.js';

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
 * /api/gamification/profile/{agentId}:
 *   get:
 *     summary: Get agent gamification profile
 *     tags: [Gamification]
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
 *         description: Agent profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 profile:
 *                   type: object
 *                   properties:
 *                     agentId:
 *                       type: number
 *                     totalPoints:
 *                       type: number
 *                     level:
 *                       type: number
 *                     currentRank:
 *                       type: string
 *                     nextRankPoints:
 *                       type: number
 *                     streak:
 *                       type: object
 *                     badges:
 *                       type: array
 *                       items:
 *                         type: object
 *                     achievements:
 *                       type: array
 *                       items:
 *                         type: object
 *                     statistics:
 *                       type: object
 *       404:
 *         description: Agent not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/profile/:agentId',
    loginLimiter,
    async (req, res) => {
        try {
            const agentId = parseInt(req.params.agentId);
            const profile = await gamificationService.getAgentProfile(agentId);
            res.json({
                success: true,
                profile
            });
        } catch (error) {
            console.error('Error fetching agent profile:', error);
            const statusCode = error.message.includes('not found') ? 404 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to fetch agent profile'
            });
        }
    }
);

/**
 * @swagger
 * /api/gamification/points:
 *   post:
 *     summary: Award points to agent
 *     tags: [Gamification]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               agentId:
 *                 type: number
 *                 description: Agent ID to award points to
 *               points:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 1000
 *                 description: Number of points to award
 *               reason:
 *                 type: string
 *                 description: Reason for awarding points
 *               category:
 *                 type: string
 *                 enum: [sales, quality, attendance, teamwork, training]
 *                 description: Category of points
 *               metadata:
 *                 type: object
 *                 description: Additional metadata
 *     responses:
 *       200:
 *         description: Points awarded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 transaction:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     agentId:
 *                       type: number
 *                     points:
 *                       type: number
 *                     reason:
 *                       type: string
 *                     newTotal:
 *                       type: number
 *                     levelUp:
 *                       type: boolean
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/points',
    loginLimiter,
    [
        body('agentId')
            .isInt({ min: 1 })
            .withMessage('agentId must be a positive integer'),
        body('points')
            .isInt({ min: 1, max: 1000 })
            .withMessage('points must be between 1 and 1000'),
        body('reason')
            .isString()
            .notEmpty()
            .withMessage('reason is required'),
        body('category')
            .isIn(['sales', 'quality', 'attendance', 'teamwork', 'training'])
            .withMessage('Invalid category')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { agentId, points, reason, category, metadata = {} } = req.body;
            const transaction = await gamificationService.awardPoints(
                agentId, points, reason, category, metadata
            );
            res.json({
                success: true,
                transaction,
                message: 'Points awarded successfully'
            });
        } catch (error) {
            console.error('Error awarding points:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to award points'
            });
        }
    }
);

/**
 * @swagger
 * /api/gamification/achievements:
 *   post:
 *     summary: Award achievement to agent
 *     tags: [Gamification]
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
 *                 description: Agent ID to award achievement to
 *               achievementId:
 *                 type: string
 *                 description: Achievement ID
 *     responses:
 *       200:
 *         description: Achievement awarded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 achievement:
 *                   type: object
 *                   properties:
 *                     agentId:
 *                       type: number
 *                     achievementId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     pointsAwarded:
 *                       type: number
 *       400:
 *         description: Invalid input or achievement already awarded
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.post('/achievements',
    loginLimiter,
    ensureSupervisor,
    [
        body('agentId')
            .isInt({ min: 1 })
            .withMessage('agentId must be a positive integer'),
        body('achievementId')
            .isString()
            .notEmpty()
            .withMessage('achievementId is required')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { agentId, achievementId } = req.body;
            const achievement = await gamificationService.awardAchievement(agentId, achievementId);
            res.json({
                success: true,
                achievement,
                message: 'Achievement awarded successfully'
            });
        } catch (error) {
            console.error('Error awarding achievement:', error);
            const statusCode = error.message.includes('already earned') ? 400 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to award achievement'
            });
        }
    }
);

/**
 * @swagger
 * /api/gamification/leaderboard:
 *   get:
 *     summary: Get gamification leaderboard
 *     tags: [Gamification]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [points, level, badges, streak]
 *           default: points
 *         description: Leaderboard type
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [all, week, month, quarter]
 *           default: all
 *         description: Time range for leaderboard
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of top performers to return
 *     responses:
 *       200:
 *         description: Leaderboard retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 leaderboard:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                     timeRange:
 *                       type: string
 *                     rankings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           rank:
 *                             type: number
 *                           agentId:
 *                             type: number
 *                           name:
 *                             type: string
 *                           value:
 *                             type: number
 *                           level:
 *                             type: number
 *                           badge:
 *                             type: string
 *                           change:
 *                             type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/leaderboard',
    loginLimiter,
    [
        query('type')
            .optional()
            .isIn(['points', 'level', 'badges', 'streak'])
            .withMessage('Invalid leaderboard type'),
        query('timeRange')
            .optional()
            .isIn(['all', 'week', 'month', 'quarter'])
            .withMessage('Invalid time range'),
        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('limit must be between 1 and 100')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const type = req.query.type || 'points';
            const timeRange = req.query.timeRange || 'all';
            const limit = parseInt(req.query.limit) || 10;

            const leaderboard = await gamificationService.getLeaderboard(type, timeRange, limit);
            res.json({
                success: true,
                leaderboard
            });
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch leaderboard'
            });
        }
    }
);

/**
 * @swagger
 * /api/gamification/challenges:
 *   get:
 *     summary: Get available challenges
 *     tags: [Gamification]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: agentId
 *         schema:
 *           type: number
 *         description: Filter challenges for specific agent
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, active, completed]
 *           default: active
 *         description: Filter by challenge status
 *     responses:
 *       200:
 *         description: Challenges retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 challenges:
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
 *                       type:
 *                         type: string
 *                       requirements:
 *                         type: object
 *                       rewards:
 *                         type: object
 *                       status:
 *                         type: string
 *                       progress:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/challenges',
    loginLimiter,
    [
        query('agentId')
            .optional()
            .isInt({ min: 1 })
            .withMessage('agentId must be a positive integer'),
        query('status')
            .optional()
            .isIn(['all', 'active', 'completed'])
            .withMessage('Invalid status')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const agentId = req.query.agentId ? parseInt(req.query.agentId) : null;
            const status = req.query.status || 'active';
            const challenges = await gamificationService.getChallenges(agentId, status);
            res.json({
                success: true,
                challenges
            });
        } catch (error) {
            console.error('Error fetching challenges:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch challenges'
            });
        }
    }
);

/**
 * @swagger
 * /api/gamification/rewards:
 *   get:
 *     summary: Get available rewards
 *     tags: [Gamification]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: agentId
 *         schema:
 *           type: number
 *         description: Filter rewards for specific agent
 *     responses:
 *       200:
 *         description: Rewards retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 rewards:
 *                   type: object
 *                   properties:
 *                     available:
 *                       type: array
 *                       items:
 *                         type: object
 *                     redeemed:
 *                       type: array
 *                       items:
 *                         type: object
 *                     totalPoints:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/rewards',
    loginLimiter,
    [
        query('agentId')
            .optional()
            .isInt({ min: 1 })
            .withMessage('agentId must be a positive integer')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const agentId = req.query.agentId ? parseInt(req.query.agentId) : null;
            const rewards = await gamificationService.getRewards(agentId);
            res.json({
                success: true,
                rewards
            });
        } catch (error) {
            console.error('Error fetching rewards:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch rewards'
            });
        }
    }
);

/**
 * @swagger
 * /api/gamification/rewards/redeem:
 *   post:
 *     summary: Redeem reward with points
 *     tags: [Gamification]
 *     security:
 *       - sessionAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               agentId:
 *                 type: number
 *                 description: Agent ID redeeming the reward
 *               rewardId:
 *                 type: string
 *                 description: Reward ID to redeem
 *     responses:
 *       200:
 *         description: Reward redeemed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 redemption:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     agentId:
 *                       type: number
 *                     rewardId:
 *                       type: string
 *                     pointsSpent:
 *                       type: number
 *                     remainingPoints:
 *                       type: number
 *       400:
 *         description: Insufficient points or invalid reward
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/rewards/redeem',
    loginLimiter,
    [
        body('agentId')
            .isInt({ min: 1 })
            .withMessage('agentId must be a positive integer'),
        body('rewardId')
            .isString()
            .notEmpty()
            .withMessage('rewardId is required')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const { agentId, rewardId } = req.body;
            const redemption = await gamificationService.redeemReward(agentId, rewardId);
            res.json({
                success: true,
                redemption,
                message: 'Reward redeemed successfully'
            });
        } catch (error) {
            console.error('Error redeeming reward:', error);
            const statusCode = error.message.includes('Insufficient points') ||
                               error.message.includes('not found') ? 400 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to redeem reward'
            });
        }
    }
);

/**
 * @swagger
 * /api/gamification/teams/leaderboard:
 *   get:
 *     summary: Get team leaderboard
 *     tags: [Gamification]
 *     security:
 *       - sessionAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [all, week, month, quarter]
 *           default: month
 *         description: Time range for leaderboard
 *     responses:
 *       200:
 *         description: Team leaderboard retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 leaderboard:
 *                   type: object
 *                   properties:
 *                     timeRange:
 *                       type: string
 *                     rankings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           rank:
 *                             type: number
 *                           teamId:
 *                             type: string
 *                           teamName:
 *                             type: string
 *                           totalPoints:
 *                             type: number
 *                           memberCount:
 *                             type: number
 *                           averagePoints:
 *                             type: number
 *                           change:
 *                             type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/teams/leaderboard',
    loginLimiter,
    [
        query('timeRange')
            .optional()
            .isIn(['all', 'week', 'month', 'quarter'])
            .withMessage('Invalid time range')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const timeRange = req.query.timeRange || 'month';
            const leaderboard = await gamificationService.getTeamLeaderboard(timeRange);
            res.json({
                success: true,
                leaderboard
            });
        } catch (error) {
            console.error('Error fetching team leaderboard:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch team leaderboard'
            });
        }
    }
);

/**
 * @swagger
 * /api/gamification/statistics:
 *   get:
 *     summary: Get gamification statistics
 *     tags: [Gamification]
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
 *         description: Time range for statistics
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 statistics:
 *                   type: object
 *                   properties:
 *                     overview:
 *                       type: object
 *                       properties:
 *                         totalAgents:
 *                           type: number
 *                         totalPoints:
 *                           type: number
 *                         activeChallenges:
 *                           type: number
 *                     engagement:
 *                       type: object
 *                       properties:
 *                         dailyActiveUsers:
 *                           type: number
 *                         averageSessionTime:
 *                           type: number
 *                         achievementRate:
 *                           type: number
 *                     performance:
 *                       type: object
 *                     trends:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Server error
 */
router.get('/statistics',
    loginLimiter,
    ensureSupervisor,
    [
        query('timeRange')
            .optional()
            .isIn(['day', 'week', 'month', 'quarter'])
            .withMessage('Invalid time range')
    ],
    validateRequest,
    async (req, res) => {
        try {
            const timeRange = req.query.timeRange || 'month';
            const statistics = await gamificationService.getStatistics(timeRange);
            res.json({
                success: true,
                statistics
            });
        } catch (error) {
            console.error('Error fetching gamification statistics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch gamification statistics'
            });
        }
    }
);

export default router;