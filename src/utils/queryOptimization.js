/**
 * Query Optimization Utilities - Sprint 2.3.2
 * Helpers y mejores prácticas para optimización de queries Sequelize
 */

import logger from './logger.js';

/**
 * Wrapper para medir tiempo de ejecución de queries
 * @param {string} queryName - Nombre de la query para logging
 * @param {Function} queryFn - Función async que ejecuta la query
 * @returns {Promise<any>}
 */
export async function measureQuery(queryName, queryFn) {
    const startTime = Date.now();

    try {
        const result = await queryFn();
        const duration = Date.now() - startTime;

        if (duration > 100) {
            logger.warn('Slow query detected', {
                queryName,
                duration: `${duration}ms`,
                threshold: '100ms'
            });
        } else {
            logger.debug('Query executed', {
                queryName,
                duration: `${duration}ms`
            });
        }

        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Query failed', {
            queryName,
            duration: `${duration}ms`,
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Configuración estándar para paginación
 * @param {number} page - Número de página (1-indexed)
 * @param {number} pageSize - Tamaño de página (default: 20)
 * @returns {Object} - {limit, offset}
 */
export function getPaginationParams(page = 1, pageSize = 20) {
    const limit = Math.min(Math.max(parseInt(pageSize), 1), 100); // Max 100 items
    const offset = (Math.max(parseInt(page), 1) - 1) * limit;

    return { limit, offset };
}

/**
 * Include estándar para Usuario (evita N+1)
 * Solo trae los campos necesarios
 */
export const userBasicInclude = {
    attributes: ['id', 'primerNombre', 'segundoNombre', 'primerApellido', 'segundoApellido', 'correo', 'rol']
};

/**
 * Include estándar para Campaña con sus relaciones
 * Optimizado para evitar N+1
 */
export const campaignFullInclude = [
    {
        association: 'formulario',
        attributes: ['id', 'nombre', 'campos']
    },
    {
        association: 'registros',
        separate: true, // Evita N+1 con query separado
        limit: 100,
        include: [{
            association: 'agente',
            attributes: ['id', 'primerNombre', 'primerApellido']
        }]
    }
];

/**
 * Opciones de ordenamiento comunes
 */
export const commonOrderOptions = {
    newest: [['createdAt', 'DESC']],
    oldest: [['createdAt', 'ASC']],
    alphabetical: [['nombre', 'ASC']],
    updated: [['updatedAt', 'DESC']]
};

/**
 * Mejores prácticas para queries Sequelize:
 *
 * 1. USAR EAGER LOADING (include) en lugar de lazy loading
 *    ❌ Mal:
 *    const users = await User.findAll();
 *    for (const user of users) {
 *        const campaigns = await user.getCampanas(); // N+1 query
 *    }
 *
 *    ✅ Bien:
 *    const users = await User.findAll({
 *        include: ['campanas'] // 1 query con JOIN
 *    });
 *
 * 2. LIMITAR ATRIBUTOS solo a los necesarios
 *    ❌ Mal:
 *    await User.findAll(); // Trae todos los campos
 *
 *    ✅ Bien:
 *    await User.findAll({
 *        attributes: ['id', 'nombre', 'correo'] // Solo campos necesarios
 *    });
 *
 * 3. USAR SEPARATE: TRUE para relaciones hasMany grandes
 *    ❌ Mal:
 *    await Campana.findAll({
 *        include: ['registros'] // JOIN puede traer millones de filas
 *    });
 *
 *    ✅ Bien:
 *    await Campana.findAll({
 *        include: [{
 *            association: 'registros',
 *            separate: true, // Query separado más eficiente
 *            limit: 100
 *        }]
 *    });
 *
 * 4. USAR PAGINACIÓN siempre
 *    ❌ Mal:
 *    await BaseCampana.findAll(); // Puede traer millones de registros
 *
 *    ✅ Bien:
 *    await BaseCampana.findAll({
 *        limit: 20,
 *        offset: 0
 *    });
 *
 * 5. USAR ÍNDICES en columnas de búsqueda frecuente
 *    Ver Sprint 2.3.3 para creación de índices
 *
 * 6. USAR RAW: TRUE cuando solo necesitas datos planos
 *    ❌ Mal:
 *    const users = await User.findAll(); // Retorna instancias Sequelize
 *
 *    ✅ Bien:
 *    const users = await User.findAll({ raw: true }); // Retorna objetos planos
 *
 * 7. EVITAR ATTRIBUTES: [] en includes con COUNT
 *    ❌ Mal:
 *    include: [{ model: Registros, attributes: [] }] // Puede causar ambigüedad
 *
 *    ✅ Bien:
 *    Usar subqueries o queries separados para COUNT
 *
 * 8. USAR TRANSACCIONES para operaciones múltiples
 *    Ver campaignService.createCampaign() para ejemplos
 */

export default {
    measureQuery,
    getPaginationParams,
    userBasicInclude,
    campaignFullInclude,
    commonOrderOptions
};
