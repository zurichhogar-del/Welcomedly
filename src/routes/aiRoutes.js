import { Router } from 'express';
import {
    generateCallSummary,
    suggestResponses,
    lookupCustomerInfo,
    checkAIStatus,
    showAIAssistant
} from '../controllers/aiController.js';
import { asegurarAutenticacion } from '../middlewares/authMiddleware.js';

const router = Router();

// Middleware de autenticación para todas las rutas AI
router.use(asegurarAutenticacion);

// Rutas API
router.post('/api/call-summary', generateCallSummary);
router.post('/api/suggest-responses', suggestResponses);
router.post('/api/customer-info', lookupCustomerInfo);
router.get('/api/status', checkAIStatus);

// Ruta para la vista del asistente AI
router.get('/assistant', showAIAssistant);

export default router;