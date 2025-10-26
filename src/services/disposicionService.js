/**
 * DisposicionService - Servicio para gestionar disposiciones de llamadas
 * Maneja códigos de cierre de llamadas (No contesta, Venta cerrada, etc.)
 * Sprint 2.3.1: Con caché Redis
 */

import db from '../models/index.js';
import { MESSAGES } from '../config/constants.js';
import cacheService from './cacheService.js'; // Sprint 2.3.1

const { Disposicion, Campana } = db;

class DisposicionService {
    /**
     * Obtener todas las disposiciones activas
     * @param {Object} filters - Filtros opcionales (tipo, activa)
     * @returns {Promise<Array>} Lista de disposiciones
     */
    async getAllDisposiciones(filters = {}) {
        const whereClause = {};

        if (filters.tipo) {
            whereClause.tipo = filters.tipo;
        }

        if (filters.activa !== undefined) {
            whereClause.activa = filters.activa;
        }

        return await Disposicion.findAll({
            where: whereClause,
            order: [['orden', 'ASC'], ['nombre', 'ASC']],
            attributes: ['id', 'nombre', 'descripcion', 'color', 'tipo', 'requiereCallback', 'activa', 'orden']
        });
    }

    /**
     * Obtener disposiciones activas (para selección en UI)
     * Sprint 2.3.1: Con caché Redis (30 min TTL)
     * @returns {Promise<Array>} Disposiciones activas ordenadas
     */
    async getActiveDisposiciones() {
        const cacheKey = cacheService.getDispositionsKey();

        return await cacheService.wrap(cacheKey, async () => {
            return await Disposicion.findAll({
                where: { activa: true },
                order: [['orden', 'ASC'], ['nombre', 'ASC']],
                attributes: ['id', 'nombre', 'color', 'tipo', 'requiereCallback']
            });
        }, 1800); // TTL: 30 minutos (las disposiciones cambian poco)
    }

    /**
     * Obtener disposiciones por tipo
     * @param {String} tipo - EXITOSA, NO_CONTACTO, SEGUIMIENTO, NO_EXITOSA
     * @returns {Promise<Array>}
     */
    async getDisposicionesByTipo(tipo) {
        return await Disposicion.findAll({
            where: { tipo, activa: true },
            order: [['orden', 'ASC'], ['nombre', 'ASC']]
        });
    }

    /**
     * Obtener disposición por ID
     * @param {Number} id
     * @returns {Promise<Object>}
     */
    async getDisposicionById(id) {
        const disposicion = await Disposicion.findByPk(id, {
            include: [{
                model: Campana,
                as: 'campanas',
                through: { attributes: [] } // No mostrar tabla intermedia
            }]
        });

        if (!disposicion) {
            throw new Error(MESSAGES.ERROR.DISPOSICION_NOT_FOUND || '⚠️ Disposición no encontrada');
        }

        return disposicion;
    }

    /**
     * Crear nueva disposición
     * Sprint 2.3.1: Invalida caché después de crear
     * @param {Object} disposicionData - { nombre, descripcion, color, tipo, requiereCallback, orden }
     * @returns {Promise<Object>}
     */
    async createDisposicion(disposicionData) {
        // Validar que no exista una disposición con el mismo nombre
        const existente = await Disposicion.findOne({
            where: { nombre: disposicionData.nombre }
        });

        if (existente) {
            throw new Error(MESSAGES.ERROR.DISPOSICION_ALREADY_EXISTS || '⚠️ Ya existe una disposición con ese nombre');
        }

        const newDisposicion = await Disposicion.create({
            nombre: disposicionData.nombre,
            descripcion: disposicionData.descripcion || null,
            color: disposicionData.color || '#6c757d',
            tipo: disposicionData.tipo || 'NO_CONTACTO',
            requiereCallback: disposicionData.requiereCallback || false,
            activa: disposicionData.activa !== undefined ? disposicionData.activa : true,
            orden: disposicionData.orden || 0
        });

        // Sprint 2.3.1: Invalidar caché de disposiciones
        await cacheService.invalidateDispositions();

        return newDisposicion;
    }

    /**
     * Actualizar disposición
     * Sprint 2.3.1: Invalida caché después de actualizar
     * @param {Number} id
     * @param {Object} updateData
     * @returns {Promise<Object>}
     */
    async updateDisposicion(id, updateData) {
        const disposicion = await Disposicion.findByPk(id);

        if (!disposicion) {
            throw new Error(MESSAGES.ERROR.DISPOSICION_NOT_FOUND || '⚠️ Disposición no encontrada');
        }

        // Si cambia el nombre, validar que no exista otro con ese nombre
        if (updateData.nombre && updateData.nombre !== disposicion.nombre) {
            const existente = await Disposicion.findOne({
                where: { nombre: updateData.nombre }
            });

            if (existente) {
                throw new Error(MESSAGES.ERROR.DISPOSICION_ALREADY_EXISTS || '⚠️ Ya existe una disposición con ese nombre');
            }
        }

        await disposicion.update(updateData);

        // Sprint 2.3.1: Invalidar caché de disposiciones
        await cacheService.invalidateDispositions();

        return disposicion;
    }

    /**
     * Eliminar disposición (solo si no está en uso)
     * @param {Number} id
     * @returns {Promise<Boolean>}
     */
    async deleteDisposicion(id) {
        const disposicion = await Disposicion.findByPk(id, {
            include: [{
                model: Campana,
                as: 'campanas'
            }]
        });

        if (!disposicion) {
            throw new Error(MESSAGES.ERROR.DISPOSICION_NOT_FOUND || '⚠️ Disposición no encontrada');
        }

        // Verificar si está asignada a alguna campaña
        if (disposicion.campanas && disposicion.campanas.length > 0) {
            throw new Error('⚠️ No se puede eliminar una disposición que está asignada a campañas');
        }

        await disposicion.destroy();
        return true;
    }

    /**
     * Alternar estado activo/inactivo de una disposición
     * @param {Number} id
     * @returns {Promise<Object>}
     */
    async toggleDisposicionStatus(id) {
        const disposicion = await Disposicion.findByPk(id);

        if (!disposicion) {
            throw new Error(MESSAGES.ERROR.DISPOSICION_NOT_FOUND || '⚠️ Disposición no encontrada');
        }

        disposicion.activa = !disposicion.activa;
        await disposicion.save();
        return disposicion;
    }

    /**
     * Asignar disposiciones a una campaña
     * @param {Number} campanaId
     * @param {Array<Number>} disposicionIds - Array de IDs de disposiciones
     * @returns {Promise<Object>}
     */
    async assignDisposicionesToCampana(campanaId, disposicionIds) {
        const campana = await Campana.findByPk(campanaId);

        if (!campana) {
            throw new Error(MESSAGES.ERROR.CAMPANA_NOT_FOUND || '⚠️ Campaña no encontrada');
        }

        // Validar que todas las disposiciones existan
        const disposiciones = await Disposicion.findAll({
            where: {
                id: disposicionIds,
                activa: true
            }
        });

        if (disposiciones.length !== disposicionIds.length) {
            throw new Error('⚠️ Algunas disposiciones no son válidas o no están activas');
        }

        // Asignar usando setDisposiciones (método de Sequelize many-to-many)
        await campana.setDisposiciones(disposicionIds);

        return {
            campanaId,
            disposicionesAsignadas: disposiciones.length
        };
    }

    /**
     * Obtener disposiciones de una campaña
     * @param {Number} campanaId
     * @returns {Promise<Array>}
     */
    async getDisposicionesByCampana(campanaId) {
        const campana = await Campana.findByPk(campanaId, {
            include: [{
                model: Disposicion,
                as: 'disposiciones',
                through: { attributes: [] },
                order: [['orden', 'ASC'], ['nombre', 'ASC']]
            }]
        });

        if (!campana) {
            throw new Error(MESSAGES.ERROR.CAMPANA_NOT_FOUND || '⚠️ Campaña no encontrada');
        }

        return campana.disposiciones || [];
    }

    /**
     * Obtener estadísticas de uso de disposiciones
     * @param {Number} campanaId - Opcional, si se quiere filtrar por campaña
     * @returns {Promise<Array>}
     */
    async getDisposicionStats(campanaId = null) {
        const { BaseCampana } = db;

        const whereClause = {};
        if (campanaId) {
            whereClause.campanaId = campanaId;
        }

        // Query para contar registros por disposición
        const stats = await BaseCampana.findAll({
            where: whereClause,
            attributes: [
                'disposicionId',
                [db.sequelize.fn('COUNT', db.sequelize.col('BaseCampana.id')), 'total']
            ],
            include: [{
                model: Disposicion,
                as: 'disposicion',
                attributes: ['nombre', 'color', 'tipo']
            }],
            group: ['disposicionId', 'disposicion.id'],
            order: [[db.sequelize.fn('COUNT', db.sequelize.col('BaseCampana.id')), 'DESC']]
        });

        return stats;
    }
}

export default new DisposicionService();
