import aiService from '../services/aiService.js';
// import enhancedAIService from '../services/enhancedAIService.js'; // ⚠️ COMENTADO: Errores de inicialización
import { asegurarAutenticacion } from '../middlewares/authMiddleware.js';

/**
 * Controlador para funcionalidades AI de asistencia a agentes
 */

/**
 * Genera resumen de llamada usando AI (Legacy)
 */
export async function generateLegacyCallSummary(req, res) {
    try {
        const { callData } = req.body;

        if (!callData) {
            req.session.swalError = '❌ Se requieren datos de la llamada';
            return res.status(400).json({ success: false, message: 'Call data required' });
        }

        const startTime = Date.now();
        const result = await aiService.generateCallSummary(callData);
        const responseTime = Date.now() - startTime;

        // Logging de la interacción
        await aiService.logAIInteraction({
            type: 'call_summary',
            userId: req.user?.id,
            success: result.success,
            tokensUsed: result.tokensUsed,
            responseTime
        });

        if (result.success) {
            return res.json({
                success: true,
                summary: result.summary,
                tokensUsed: result.tokensUsed
            });
        } else {
            return res.status(500).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        console.error('Error in generateCallSummary controller:', error);
        req.session.swalError = '❌ Error al generar resumen de llamada';
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

/**
 * Sugiere respuestas para el agente
 */
export async function suggestResponses(req, res) {
    try {
        const { context, customerMessage } = req.body;

        if (!context || !customerMessage) {
            req.session.swalError = '❌ Se requieren contexto y mensaje del cliente';
            return res.status(400).json({
                success: false,
                message: 'Context and customer message required'
            });
        }

        const startTime = Date.now();
        const result = await aiService.suggestResponses(context, customerMessage);
        const responseTime = Date.now() - startTime;

        // Logging de la interacción
        await aiService.logAIInteraction({
            type: 'response_suggestions',
            userId: req.user?.id,
            success: result.success,
            tokensUsed: result.tokensUsed,
            responseTime
        });

        if (result.success) {
            return res.json({
                success: true,
                suggestions: result.suggestions,
                tokensUsed: result.tokensUsed
            });
        } else {
            return res.status(500).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        console.error('Error in suggestResponses controller:', error);
        req.session.swalError = '❌ Error al generar sugerencias';
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

/**
 * Busca información de cliente con AI
 */
export async function lookupCustomerInfo(req, res) {
    try {
        const { customerInfo, query } = req.body;

        if (!customerInfo) {
            req.session.swalError = '❌ Se requiere información del cliente';
            return res.status(400).json({
                success: false,
                message: 'Customer info required'
            });
        }

        const startTime = Date.now();
        const result = await aiService.lookupCustomerInfo(customerInfo, query);
        const responseTime = Date.now() - startTime;

        // Logging de la interacción
        await aiService.logAIInteraction({
            type: 'customer_lookup',
            userId: req.user?.id,
            success: result.success,
            tokensUsed: result.tokensUsed,
            responseTime
        });

        if (result.success) {
            return res.json({
                success: true,
                info: result.info,
                tokensUsed: result.tokensUsed
            });
        } else {
            return res.status(500).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        console.error('Error in lookupCustomerInfo controller:', error);
        req.session.swalError = '❌ Error al buscar información del cliente';
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

/**
 * Verifica el estado del servicio AI
 */
export async function checkAIStatus(req, res) {
    try {
        const isConfigured = aiService.isConfigured();

        return res.json({
            success: true,
            configured: isConfigured,
            model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
            maxTokens: process.env.OPENAI_MAX_TOKENS || 500
        });

    } catch (error) {
        console.error('Error in checkAIStatus controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

/**
 * Renderiza la vista de AI Assistant
 */
export function showAIAssistant(req, res) {
    try {
        res.render('ai/ai-assistant', {
            layout: 'layouts/generalLayout',
            usuario: req.user || req.session.usuario,
            swalError: req.session.swalError,
            mensajeExito: req.session.mensajeExito
        });

        // Limpiar mensajes de sesión
        delete req.session.swalError;
        delete req.session.mensajeExito;

    } catch (error) {
        console.error('Error rendering AI assistant view:', error);
        req.session.swalError = '❌ Error al cargar asistente AI';
        return res.redirect('/market/market');
    }
}

// =================== FASE 2: Enhanced AI Controllers ===================

/**
 * Get real-time assistance for agents
 */
export async function getRealTimeAssistance(req, res) {
    try {
        const { agentId, context, customerMessage } = req.body;

        if (!agentId || !context) {
            return res.status(400).json({
                success: false,
                message: 'Agent ID and context are required'
            });
        }

        const result = await enhancedAIService.getRealTimeAssistance({
            agentId,
            context,
            customerMessage
        });

        res.json({
            success: true,
            assistance: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in getRealTimeAssistance:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get real-time assistance'
        });
    }
}

/**
 * Analyze sentiment of customer message
 */
export async function analyzeSentiment(req, res) {
    try {
        const { text, metadata = {} } = req.body;

        if (!text) {
            return res.status(400).json({
                success: false,
                message: 'Text is required for sentiment analysis'
            });
        }

        const result = await enhancedAIService.analyzeSentiment(text, metadata);

        res.json({
            success: true,
            sentiment: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in analyzeSentiment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to analyze sentiment'
        });
    }
}

/**
 * Generate call summary with enhanced AI
 */
export async function generateCallSummary(req, res) {
    try {
        const { callId, callData } = req.body;

        if (!callId || !callData) {
            return res.status(400).json({
                success: false,
                message: 'Call ID and call data are required'
            });
        }

        const result = await enhancedAIService.generateCallSummary(callId, callData);

        res.json({
            success: true,
            summary: result,
            callId,
            generatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in generateCallSummary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate call summary'
        });
    }
}

/**
 * Search knowledge base
 */
export async function searchKnowledgeBase(req, res) {
    try {
        const { query, context = {} } = req.body;

        if (!query) {
            return res.status(400).json({
                success: false,
                message: 'Query is required for knowledge base search'
            });
        }

        const result = await enhancedAIService.searchKnowledgeBase(query, context);

        res.json({
            success: true,
            search: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in searchKnowledgeBase:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search knowledge base'
        });
    }
}

/**
 * Predict next best action
 */
export async function predictNextAction(req, res) {
    try {
        const { context, conversationHistory = [] } = req.body;

        if (!context) {
            return res.status(400).json({
                success: false,
                message: 'Context is required for action prediction'
            });
        }

        const result = await enhancedAIService.predictNextAction(context, conversationHistory);

        res.json({
            success: true,
            prediction: result,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in predictNextAction:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to predict next action'
        });
    }
}

/**
 * Analyze call interaction for quality
 */
export async function analyzeCallInteraction(req, res) {
    try {
        const { agentId, callId, duration, transcript, recordingUrl, qualityManual } = req.body;

        if (!agentId || !callId || !duration) {
            return res.status(400).json({
                success: false,
                message: 'Agent ID, call ID, and duration are required'
            });
        }

        const result = await enhancedAIService.analyzeCallInteraction({
            agentId,
            callId,
            duration,
            transcript,
            recordingUrl,
            qualityManual
        });

        res.json({
            success: true,
            analysis: result,
            callId,
            agentId,
            analysisDate: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in analyzeCallInteraction:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to analyze call interaction'
        });
    }
}

/**
 * Start speech analysis
 */
export async function startSpeechAnalysis(req, res) {
    try {
        const { callId, audioStream } = req.body;

        if (!callId || !audioStream) {
            return res.status(400).json({
                success: false,
                message: 'Call ID and audio stream are required'
            });
        }

        const result = await enhancedAIService.startSpeechAnalysis(callId, audioStream);

        res.json({
            success: true,
            stream: result,
            callId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in startSpeechAnalysis:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start speech analysis'
        });
    }
}

/**
 * Get AI service statistics
 */
export async function getAIServiceStats(req, res) {
    try {
        const stats = await enhancedAIService.getServiceStats();

        res.json({
            success: true,
            stats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in getAIServiceStats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get AI service statistics'
        });
    }
}

/**
 * Get quality statistics
 */
export async function getQualityStats(req, res) {
    try {
        const stats = await enhancedAIService.getQualityStats();

        res.json({
            success: true,
            stats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error in getQualityStats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get quality statistics'
        });
    }
}