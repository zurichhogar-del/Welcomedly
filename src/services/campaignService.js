import sequelize from '../database/connection.js';
import db from '../models/index.js';
import { MESSAGES } from '../config/constants.js';

const Campana = db.Campana;
const BaseCampana = db.BaseCampana;
const Formulario = db.Formulario;
const User = db.User;

/**
 * Servicio de Campañas
 * Maneja toda la lógica de negocio relacionada con campañas
 */
class CampaignService {
    /**
     * Obtener todas las campañas con conteo de registros
     * @returns {Array} Lista de campañas
     */
    async getAllCampaigns() {
        try {
            const campanas = await Campana.findAll({
                order: [['createdAt', 'DESC']],
                include: [{
                    model: BaseCampana,
                    as: 'registros',
                    attributes: [],
                    required: false
                }],
                attributes: [
                    'id',
                    'nombre',
                    'estado',
                    'createdAt',
                    [sequelize.fn('COUNT', sequelize.col('registros.id')), 'cantidadRegistros']
                ],
                group: ['Campana.id'],
                raw: true
            });

            return campanas;

        } catch (error) {
            throw new Error(MESSAGES.ERROR.SERVER_ERROR);
        }
    }

    /**
     * Obtener campaña por ID con detalles completos
     * @param {number} id - ID de la campaña
     * @returns {Object} Campaña con registros
     */
    async getCampaignById(id) {
        try {
            const campana = await Campana.findByPk(id, {
                include: [
                    {
                        model: Formulario,
                        as: 'formulario',
                        attributes: ['id', 'campos']
                    },
                    {
                        model: BaseCampana,
                        as: 'registros',
                        include: [{
                            model: User,
                            as: 'agente',
                            attributes: ['primerNombre', 'primerApellido']
                        }]
                    }
                ]
            });

            if (!campana) {
                throw new Error(MESSAGES.ERROR.CAMPAIGN_NOT_FOUND);
            }

            return campana;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Crear nueva campaña
     * @param {Object} campaignData - Datos de la campaña
     * @param {Array} registros - Registros de la base de datos
     * @returns {Object} Campaña creada
     */
    async createCampaign(campaignData, registros) {
        const transaction = await sequelize.transaction();

        try {
            // Crear campaña
            const campana = await Campana.create({
                nombre: campaignData.nombre,
                formularioId: campaignData.formularioId,
                baseDatos: campaignData.baseDatos,
                agentesAsignados: campaignData.agentesAsignados,
                guion: campaignData.guion || null
            }, { transaction });

            // Asignar registros equitativamente a agentes
            const agentes = campaignData.agentesAsignados;
            const registrosPorAgente = Math.ceil(registros.length / agentes.length);

            for (let i = 0; i < registros.length; i++) {
                const agenteIndex = Math.floor(i / registrosPorAgente) % agentes.length;
                await BaseCampana.create({
                    ...registros[i],
                    campanaId: campana.id,
                    agenteId: agentes[agenteIndex]
                }, { transaction });
            }

            await transaction.commit();
            return campana;

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Eliminar campaña y sus registros
     * @param {number} id - ID de la campaña
     */
    async deleteCampaign(id) {
        const transaction = await sequelize.transaction();

        try {
            // Eliminar registros asociados primero
            await BaseCampana.destroy({ where: { campanaId: id }, transaction });

            // Eliminar campaña
            const deleted = await Campana.destroy({ where: { id }, transaction });

            if (!deleted) {
                throw new Error(MESSAGES.ERROR.CAMPAIGN_NOT_FOUND);
            }

            await transaction.commit();
            return true;

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Agregar registro manual a campaña
     * @param {number} campanaId - ID de la campaña
     * @param {Object} registroData - Datos del registro
     * @returns {Object} Registro creado
     */
    async addRecordToCampaign(campanaId, registroData) {
        const transaction = await sequelize.transaction();

        try {
            // Validar campos obligatorios
            if (!registroData.nombre?.trim() || !registroData.telefono?.trim() || !registroData.correo?.trim()) {
                throw new Error(MESSAGES.ERROR.RECORD_REQUIRED_FIELDS);
            }

            // Procesar datos adicionales
            const otrosCampos = {};
            Object.entries(registroData).forEach(([key, value]) => {
                if (value && !['nombre', 'telefono', 'correo', 'campanaId'].includes(key)) {
                    otrosCampos[key] = value;
                }
            });

            // Crear registro
            const nuevoRegistro = await BaseCampana.create({
                nombre: registroData.nombre.trim(),
                telefono: registroData.telefono.replace(/\D/g, ''),
                correo: registroData.correo.toLowerCase().trim(),
                otrosCampos: Object.keys(otrosCampos).length > 0 ? otrosCampos : null,
                campanaId
            }, { transaction });

            await transaction.commit();
            return nuevoRegistro;

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Guardar tipificación de registro
     * @param {number} registroId - ID del registro
     * @param {string} tipificacion - Tipificación seleccionada
     * @returns {Object} Registro actualizado
     */
    async saveTypification(registroId, tipificacion) {
        const transaction = await sequelize.transaction();

        try {
            if (!tipificacion) {
                throw new Error(MESSAGES.ERROR.TYPIFICATION_REQUIRED);
            }

            const updated = await BaseCampana.update(
                { tipificacion },
                {
                    where: { id: registroId },
                    transaction
                }
            );

            if (!updated[0]) {
                throw new Error(MESSAGES.ERROR.RECORD_NOT_FOUND);
            }

            await transaction.commit();
            return true;

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Guardar disposición y callback en un registro
     * @param {number} registroId - ID del registro
     * @param {Object} data - { disposicionId, callbackDate, callbackNotas }
     * @returns {Object} Registro actualizado
     */
    async saveDisposicion(registroId, data) {
        const transaction = await sequelize.transaction();

        try {
            if (!data.disposicionId) {
                throw new Error('⚠️ Debe seleccionar una disposición');
            }

            const updateData = {
                disposicionId: data.disposicionId,
                intentosLlamada: sequelize.literal('intentos_llamada + 1'),
                ultimaLlamada: new Date()
            };

            // Si se proporciona callback
            if (data.callbackDate) {
                updateData.callbackDate = new Date(data.callbackDate);
                updateData.callbackNotas = data.callbackNotas || null;
            }

            const [affectedRows] = await BaseCampana.update(
                updateData,
                {
                    where: { id: registroId },
                    transaction
                }
            );

            if (!affectedRows) {
                throw new Error(MESSAGES.ERROR.RECORD_NOT_FOUND);
            }

            await transaction.commit();

            // Retornar registro actualizado
            const registroActualizado = await BaseCampana.findByPk(registroId, {
                include: [{
                    model: db.Disposicion,
                    as: 'disposicion',
                    attributes: ['nombre', 'color', 'tipo', 'requiereCallback']
                }]
            });

            return registroActualizado;

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Obtener callbacks pendientes (filtrados por fecha y agente)
     * @param {Object} filters - { agenteId?, fecha?, campanaId? }
     * @returns {Array} Registros con callbacks pendientes
     */
    async getCallbacksPendientes(filters = {}) {
        try {
            const whereClause = {
                callbackDate: {
                    [db.Sequelize.Op.not]: null
                }
            };

            // Filtrar por agente
            if (filters.agenteId) {
                whereClause.agenteId = filters.agenteId;
            }

            // Filtrar por campaña
            if (filters.campanaId) {
                whereClause.campanaId = filters.campanaId;
            }

            // Filtrar por fecha (callbacks hasta hoy)
            if (filters.fecha) {
                whereClause.callbackDate = {
                    [db.Sequelize.Op.lte]: new Date(filters.fecha)
                };
            } else {
                // Por defecto, callbacks hasta hoy
                whereClause.callbackDate = {
                    [db.Sequelize.Op.lte]: new Date()
                };
            }

            const callbacks = await BaseCampana.findAll({
                where: whereClause,
                include: [
                    {
                        model: Campana,
                        as: 'campana',
                        attributes: ['id', 'nombre']
                    },
                    {
                        model: User,
                        as: 'agente',
                        attributes: ['id', 'primerNombre', 'primerApellido']
                    },
                    {
                        model: db.Disposicion,
                        as: 'disposicion',
                        attributes: ['nombre', 'color', 'tipo']
                    }
                ],
                order: [['callbackDate', 'ASC']]
            });

            return callbacks;

        } catch (error) {
            throw new Error('Error al obtener callbacks pendientes: ' + error.message);
        }
    }

    /**
     * Obtener registros por disposición
     * @param {number} campanaId - ID de la campaña
     * @param {number} disposicionId - ID de la disposición
     * @returns {Array} Registros filtrados
     */
    async getRecordsByDisposicion(campanaId, disposicionId) {
        try {
            const registros = await BaseCampana.findAll({
                where: {
                    campanaId,
                    disposicionId
                },
                include: [
                    {
                        model: User,
                        as: 'agente',
                        attributes: ['primerNombre', 'primerApellido']
                    },
                    {
                        model: db.Disposicion,
                        as: 'disposicion',
                        attributes: ['nombre', 'color', 'tipo']
                    }
                ],
                order: [['ultimaLlamada', 'DESC']]
            });

            return registros;

        } catch (error) {
            throw new Error('Error al obtener registros por disposición: ' + error.message);
        }
    }

    /**
     * Obtener estadísticas de campaña
     * @param {number} campanaId - ID de la campaña
     * @returns {Object} Estadísticas
     */
    async getCampaignStats(campanaId) {
        try {
            const stats = await BaseCampana.findAll({
                where: { campanaId },
                attributes: [
                    'tipificacion',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
                ],
                group: ['tipificacion'],
                raw: true
            });

            const totalRegistros = await BaseCampana.count({ where: { campanaId } });

            return {
                totalRegistros,
                porTipificacion: stats
            };

        } catch (error) {
            throw new Error(MESSAGES.ERROR.SERVER_ERROR);
        }
    }
}

export default new CampaignService();
