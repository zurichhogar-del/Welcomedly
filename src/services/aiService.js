import OpenAI from 'openai';
import { MESSAGES } from '../config/constants.js';

/**
 * AI Service para asistencia a agentes
 * Proporciona funcionalidades AI para mejorar la productividad de los agentes
 */
class AIService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder',
            timeout: 10000 // 10 segundos timeout
        });

        this.config = {
            model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
            maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 500,
            temperature: 0.7
        };
    }

    /**
     * Verifica si el servicio AI está configurado y disponible
     * @returns {boolean} true si está configurado
     */
    isConfigured() {
        return process.env.OPENAI_API_KEY &&
               process.env.OPENAI_API_KEY !== 'tu_openai_api_key_aqui' &&
               process.env.OPENAI_API_KEY !== 'sk-placeholder';
    }

    /**
     * Genera un resumen de llamada usando AI
     * @param {Object} callData - Datos de la llamada
     * @returns {Promise<Object>} Resumen generado
     */
    async generateCallSummary(callData) {
        try {
            if (!this.isConfigured()) {
                return {
                    success: false,
                    message: 'AI service not configured',
                    summary: null
                };
            }

            const prompt = this.buildCallSummaryPrompt(callData);

            const response = await this.openai.chat.completions.create({
                model: this.config.model,
                messages: [
                    {
                        role: 'system',
                        content: 'Eres un asistente experto en centros de llamadas que genera resúmenes concisos y profesionales de interacciones con clientes.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: this.config.maxTokens,
                temperature: this.config.temperature
            });

            const summary = response.choices[0]?.message?.content || '';

            return {
                success: true,
                summary: summary.trim(),
                tokensUsed: response.usage?.total_tokens || 0
            };

        } catch (error) {
            console.error('Error generating call summary:', error);
            return {
                success: false,
                message: 'Error generating AI summary',
                summary: null,
                error: error.message
            };
        }
    }

    /**
     * Sugiere respuestas para el agente basadas en el contexto
     * @param {string} context - Contexto de la conversación
     * @param {string} customerMessage - Mensaje del cliente
     * @returns {Promise<Object>} Sugerencias generadas
     */
    async suggestResponses(context, customerMessage) {
        try {
            if (!this.isConfigured()) {
                return {
                    success: false,
                    message: 'AI service not configured',
                    suggestions: []
                };
            }

            const prompt = this.buildResponseSuggestionsPrompt(context, customerMessage);

            const response = await this.openai.chat.completions.create({
                model: this.config.model,
                messages: [
                    {
                        role: 'system',
                        content: 'Eres un experto en servicio al cliente que sugiere respuestas profesionales y efectivas para agentes de centro de llamadas.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: this.config.maxTokens,
                temperature: this.config.temperature
            });

            const suggestionsText = response.choices[0]?.message?.content || '';
            const suggestions = this.parseSuggestions(suggestionsText);

            return {
                success: true,
                suggestions,
                tokensUsed: response.usage?.total_tokens || 0
            };

        } catch (error) {
            console.error('Error generating response suggestions:', error);
            return {
                success: false,
                message: 'Error generating AI suggestions',
                suggestions: [],
                error: error.message
            };
        }
    }

    /**
     * Busca información relevante del cliente
     * @param {Object} customerInfo - Información del cliente
     * @param {string} query - Consulta específica
     * @returns {Promise<Object>} Información encontrada
     */
    async lookupCustomerInfo(customerInfo, query = '') {
        try {
            if (!this.isConfigured()) {
                return {
                    success: false,
                    message: 'AI service not configured',
                    info: null
                };
            }

            const prompt = this.buildCustomerInfoPrompt(customerInfo, query);

            const response = await this.openai.chat.completions.create({
                model: this.config.model,
                messages: [
                    {
                        role: 'system',
                        content: 'Eres un asistente que analiza información de clientes para proporcionar insights relevantes para agentes de centro de llamadas.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: this.config.maxTokens,
                temperature: this.config.temperature
            });

            const info = response.choices[0]?.message?.content || '';

            return {
                success: true,
                info: info.trim(),
                tokensUsed: response.usage?.total_tokens || 0
            };

        } catch (error) {
            console.error('Error looking up customer info:', error);
            return {
                success: false,
                message: 'Error generating customer insights',
                info: null,
                error: error.message
            };
        }
    }

    /**
     * Construye el prompt para generar resumen de llamada
     * @private
     */
    buildCallSummaryPrompt(callData) {
        const {
            customerName = '',
            campaignName = '',
            duration = '',
            disposition = '',
            notes = '',
            agentNotes = ''
        } = callData;

        return `Genera un resumen conciso y profesional de la siguiente llamada:

Cliente: ${customerName}
Campaña: ${campaignName}
Duración: ${duration}
Disposición: ${disposition}
Notas del sistema: ${notes}
Notas del agente: ${agentNotes}

Proporciona un resumen que incluya:
1. Puntos principales de la conversación
2. Resultados y próximos pasos
3. Información relevante para seguimiento

Mantén el resumen profesional, conciso (máximo 200 palabras) y enfocado en información accionable.`;
    }

    /**
     * Construye el prompt para sugerir respuestas
     * @private
     */
    buildResponseSuggestionsPrompt(context, customerMessage) {
        return `Basado en el siguiente contexto y mensaje del cliente, sugiere 3 respuestas profesionales y efectivas:

Contexto de la campaña/llamada:
${context}

Mensaje del cliente:
"${customerMessage}"

Proporciona exactamente 3 sugerencias numeradas. Cada sugerencia debe ser:
- Profesional y empática
- Orientada a resolver el problema
- Apropiada para el contexto del centro de llamadas
- Directa y fácil de comunicar`;
    }

    /**
     * Construye el prompt para información de cliente
     * @private
     */
    buildCustomerInfoPrompt(customerInfo, query) {
        const {
            name = '',
            email = '',
            phone = '',
            campaign = '',
            previousInteractions = '',
            customData = ''
        } = customerInfo;

        let prompt = `Analiza la siguiente información del cliente y proporciona insights relevantes:

Nombre: ${name}
Email: ${email}
Teléfono: ${phone}
Campaña actual: ${campaign}
Interacciones previas: ${previousInteractions}
Datos adicionales: ${customData}`;

        if (query) {
            prompt += `\n\nConsulta específica del agente: ${query}`;
        }

        prompt += `

Proporciona información útil que ayude al agente a:
1. Entender mejor al cliente
2. Identificar oportunidades o necesidades
3. Personalizar el enfoque de comunicación
4. Anticipar posibles preguntas o preocupaciones

Sé conciso pero informativo.`;

        return prompt;
    }

    /**
     * Parsea las sugerencias del texto generado
     * @private
     */
    parseSuggestions(suggestionsText) {
        const suggestions = [];
        const lines = suggestionsText.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            // Busca líneas numeradas (1., 2., 3.) o que comiencen con guiones
            if (/^\d+\./.test(trimmed) || /^[-*]/.test(trimmed)) {
                // Elimina el número o guión inicial y limpia
                const suggestion = trimmed.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '').trim();
                if (suggestion && suggestion.length > 10) {
                    suggestions.push(suggestion);
                }
            }
        }

        // Si no se encontraron sugerencias formateadas, divide por párrafos
        if (suggestions.length === 0) {
            const paragraphs = suggestionsText.split('\n\n').filter(p => p.trim().length > 20);
            return paragraphs.slice(0, 3); // Máximo 3 sugerencias
        }

        return suggestions.slice(0, 3); // Máximo 3 sugerencias
    }

    /**
     * Registra una interacción con AI para análisis y mejora
     * @param {Object} interactionData - Datos de la interacción
     */
    async logAIInteraction(interactionData) {
        try {
            // Aquí se podría implementar logging a base de datos
            // Por ahora, solo console.log para desarrollo
            console.log('AI Interaction:', {
                timestamp: new Date().toISOString(),
                type: interactionData.type,
                userId: interactionData.userId,
                success: interactionData.success,
                tokensUsed: interactionData.tokensUsed,
                responseTime: interactionData.responseTime
            });

            return { success: true };
        } catch (error) {
            console.error('Error logging AI interaction:', error);
            return { success: false, error: error.message };
        }
    }
}

export default new AIService();