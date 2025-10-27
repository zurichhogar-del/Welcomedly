import { Router } from 'express';
import {
    generateCallSummary,
    suggestResponses,
    lookupCustomerInfo,
    checkAIStatus,
    showAIAssistant
} from '../controllers/aiController.js';
import { asegurarAutenticacion } from '../middlewares/authMiddleware.js';
// Sprint 2.4.2: Throttling para AI endpoints (costosos - OpenAI API)
import { aiLimiter } from '../middlewares/advancedRateLimiting.js';

const router = Router();

// Middleware de autenticación para todas las rutas AI
router.use(asegurarAutenticacion);

// Sprint 2.4.2: aiLimiter - 5 req/min (AGENTE), 15 req/min (ADMIN)
// Rutas API
router.post('/api/call-summary', aiLimiter, generateCallSummary);
router.post('/api/suggest-responses', aiLimiter, suggestResponses);
router.post('/api/customer-info', aiLimiter, lookupCustomerInfo);
router.get('/api/status', checkAIStatus);

// Sprint 3.2: Real-time AI Assistant Routes
import {
    getRealtimeSuggestions,
    transcribeAudio,
    analyzeSentiment,
    summarizeCall
} from '../controllers/aiController.js';

router.post('/suggestions/realtime', aiLimiter, getRealtimeSuggestions);
router.post('/transcribe', aiLimiter, transcribeAudio);
router.post('/analyze-sentiment', aiLimiter, analyzeSentiment);
router.post('/summarize-call', aiLimiter, summarizeCall);

// Ruta para la vista del asistente AI
router.get('/assistant', showAIAssistant);

export default router;