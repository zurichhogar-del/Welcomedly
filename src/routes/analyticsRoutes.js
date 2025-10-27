import express from 'express';
import analyticsController from '../controllers/analyticsController.js';
import { asegurarAutenticacion } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Aplicar autenticación a todas las rutas
router.use(asegurarAutenticacion);

// Dashboard principal
router.get('/dashboard', analyticsController.renderDashboard);

// API - Métricas de agentes
router.get('/api/agent/:agentId', analyticsController.getAgentMetrics);
router.get('/api/agent/:agentId/hourly', analyticsController.getAgentHourlyMetrics);
router.get('/api/agent/:agentId/trend', analyticsController.getAgentTrend);

// API - Métricas de campañas
router.get('/api/campaign/:campaignId', analyticsController.getCampaignMetrics);
router.get('/api/campaign/:campaignId/trend', analyticsController.getCampaignTrend);

// API - Comparación de agentes
router.get('/api/agents/compare', analyticsController.compareAgents);

// Exportación a CSV
router.get('/export/agents/csv', analyticsController.exportAgentsToCSV);
router.get('/export/campaign/:campaignId/csv', analyticsController.exportCampaignToCSV);

export default router;
