import aiService from '../services/aiService.js';
import { asegurarAutenticacion } from '../middlewares/authMiddleware.js';

/**
 * Controlador para funcionalidades AI de asistencia a agentes
 */

/**
 * Genera resumen de llamada usando AI
 */
export async function generateCallSummary(req, res) {
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