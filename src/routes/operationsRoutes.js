import express from 'express';
import { requireOperations } from '../middlewares/rbacMiddleware.js';
import {
    getOperationsDashboard,
    getAgentMonitoring,
    updateAgentStatus,
    getProductivityReport,
    getRealTimeDashboardData,
    getCampaignPerformance,
    sendCommandToAgent
} from '../controllers/operationsController.js';

const router = express.Router();

// Apply operations middleware to all routes
router.use(requireOperations);

// Dashboard routes
router.get('/dashboard', getOperationsDashboard);

// Agent monitoring routes
router.get('/api/agents', getAgentMonitoring);
router.put('/api/agents/:agentId/status', updateAgentStatus);

// Reports routes
router.get('/api/reports/productivity', getProductivityReport);

// Real-time data routes
router.get('/api/dashboard/realtime', getRealTimeDashboardData);
router.get('/api/campaigns/performance', getCampaignPerformance);

// Agent communication routes
router.post('/api/agents/:agentId/command', sendCommandToAgent);

export default router;