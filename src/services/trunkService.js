/**
 * Trunk Service - Sprint 3.1.6
 * Gestión de troncales SIP (Twilio, Vonage, etc.)
 */

import db from '../models/index.js';
import logger from '../utils/logger.js';
import telephonyService from './telephonyService.js';

const { Trunk, Campana } = db;

class TrunkService {
    /**
     * Obtener todos los trunks
     */
    async getAllTrunks() {
        try {
            return await Trunk.findAll({
                include: [
                    {
                        model: Campana,
                        as: 'campaigns',
                        through: { attributes: ['priority'] },
                        attributes: ['id', 'nombre', 'descripcion']
                    }
                ],
                order: [['priority', 'DESC'], ['name', 'ASC']]
            });
        } catch (error) {
            logger.error('Error obteniendo trunks', { error: error.message });
            throw error;
        }
    }

    /**
     * Obtener trunks activos
     */
    async getActiveTrunks() {
        try {
            return await Trunk.findAll({
                where: {
                    status: 'active'
                },
                order: [['priority', 'DESC']]
            });
        } catch (error) {
            logger.error('Error obteniendo trunks activos', { error: error.message });
            throw error;
        }
    }

    /**
     * Obtener trunk por ID
     */
    async getTrunkById(id) {
        try {
            const trunk = await Trunk.findByPk(id, {
                include: [
                    {
                        model: Campana,
                        as: 'campaigns',
                        through: { attributes: ['priority'] }
                    }
                ]
            });

            if (!trunk) {
                throw new Error(`Trunk con ID ${id} no encontrado`);
            }

            return trunk;
        } catch (error) {
            logger.error('Error obteniendo trunk por ID', { id, error: error.message });
            throw error;
        }
    }

    /**
     * Crear nuevo trunk
     */
    async createTrunk(trunkData) {
        try {
            // Validar datos requeridos
            const requiredFields = ['name', 'provider', 'host', 'port'];
            for (const field of requiredFields) {
                if (!trunkData[field]) {
                    throw new Error(`Campo requerido faltante: ${field}`);
                }
            }

            // Crear trunk
            const trunk = await Trunk.create({
                name: trunkData.name,
                description: trunkData.description || null,
                provider: trunkData.provider,
                trunkType: trunkData.trunkType || 'pjsip',
                host: trunkData.host,
                port: trunkData.port,
                username: trunkData.username || null,
                password: trunkData.password || null,
                fromUser: trunkData.fromUser || null,
                fromDomain: trunkData.fromDomain || null,
                maxChannels: trunkData.maxChannels || 10,
                priority: trunkData.priority || 10,
                status: trunkData.status || 'active',
                advancedSettings: trunkData.advancedSettings || {}
            });

            logger.info('Trunk creado exitosamente', {
                trunkId: trunk.id,
                name: trunk.name,
                provider: trunk.provider
            });

            // Actualizar configuración de Asterisk (si está conectado)
            if (telephonyService.connected) {
                try {
                    await this._updateAsteriskConfig(trunk);
                } catch (asteriskError) {
                    logger.warn('No se pudo actualizar configuración de Asterisk', {
                        trunkId: trunk.id,
                        error: asteriskError.message
                    });
                }
            }

            return trunk;
        } catch (error) {
            logger.error('Error creando trunk', { error: error.message });
            throw error;
        }
    }

    /**
     * Actualizar trunk
     */
    async updateTrunk(id, trunkData) {
        try {
            const trunk = await Trunk.findByPk(id);

            if (!trunk) {
                throw new Error(`Trunk con ID ${id} no encontrado`);
            }

            // Actualizar campos
            const updatableFields = [
                'name', 'description', 'host', 'port', 'username', 'password',
                'fromUser', 'fromDomain', 'maxChannels', 'priority', 'status',
                'advancedSettings'
            ];

            updatableFields.forEach(field => {
                if (trunkData[field] !== undefined) {
                    trunk[field] = trunkData[field];
                }
            });

            await trunk.save();

            logger.info('Trunk actualizado exitosamente', {
                trunkId: trunk.id,
                name: trunk.name
            });

            // Actualizar configuración de Asterisk
            if (telephonyService.connected) {
                try {
                    await this._updateAsteriskConfig(trunk);
                } catch (asteriskError) {
                    logger.warn('No se pudo actualizar configuración de Asterisk', {
                        trunkId: trunk.id,
                        error: asteriskError.message
                    });
                }
            }

            return trunk;
        } catch (error) {
            logger.error('Error actualizando trunk', { id, error: error.message });
            throw error;
        }
    }

    /**
     * Eliminar trunk
     */
    async deleteTrunk(id) {
        try {
            const trunk = await Trunk.findByPk(id);

            if (!trunk) {
                throw new Error(`Trunk con ID ${id} no encontrado`);
            }

            // Verificar que no esté en uso
            const activeCalls = await db.Call.count({
                where: {
                    trunkId: id,
                    endTime: null // Llamadas activas
                }
            });

            if (activeCalls > 0) {
                throw new Error(`No se puede eliminar trunk con ${activeCalls} llamadas activas`);
            }

            await trunk.destroy();

            logger.info('Trunk eliminado exitosamente', {
                trunkId: id,
                name: trunk.name
            });

            return true;
        } catch (error) {
            logger.error('Error eliminando trunk', { id, error: error.message });
            throw error;
        }
    }

    /**
     * Asignar trunk a campaña
     */
    async assignTrunkToCampaign(trunkId, campanaId, priority = 10) {
        try {
            const trunk = await Trunk.findByPk(trunkId);
            const campana = await Campana.findByPk(campanaId);

            if (!trunk) {
                throw new Error(`Trunk con ID ${trunkId} no encontrado`);
            }

            if (!campana) {
                throw new Error(`Campaña con ID ${campanaId} no encontrada`);
            }

            // Verificar si ya está asignado
            const existing = await db.sequelize.models.campaign_trunks.findOne({
                where: {
                    campanaId,
                    trunkId
                }
            });

            if (existing) {
                // Actualizar prioridad
                existing.priority = priority;
                await existing.save();

                logger.info('Prioridad de trunk actualizada para campaña', {
                    trunkId,
                    campanaId,
                    priority
                });
            } else {
                // Crear nueva asignación
                await campana.addTrunk(trunk, { through: { priority } });

                logger.info('Trunk asignado a campaña exitosamente', {
                    trunkId,
                    campanaId,
                    priority
                });
            }

            return true;
        } catch (error) {
            logger.error('Error asignando trunk a campaña', {
                trunkId,
                campanaId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Remover trunk de campaña
     */
    async removeTrunkFromCampaign(trunkId, campanaId) {
        try {
            const trunk = await Trunk.findByPk(trunkId);
            const campana = await Campana.findByPk(campanaId);

            if (!trunk || !campana) {
                throw new Error('Trunk o campaña no encontrados');
            }

            await campana.removeTrunk(trunk);

            logger.info('Trunk removido de campaña exitosamente', {
                trunkId,
                campanaId
            });

            return true;
        } catch (error) {
            logger.error('Error removiendo trunk de campaña', {
                trunkId,
                campanaId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Obtener estadísticas de trunk
     */
    async getTrunkStats(id) {
        try {
            const trunk = await Trunk.findByPk(id);

            if (!trunk) {
                throw new Error(`Trunk con ID ${id} no encontrado`);
            }

            // Obtener estadísticas de llamadas
            const totalCalls = await db.Call.count({
                where: { trunkId: id }
            });

            const successfulCalls = await db.Call.count({
                where: {
                    trunkId: id,
                    disposition: 'ANSWERED'
                }
            });

            const failedCalls = await db.Call.count({
                where: {
                    trunkId: id,
                    disposition: 'FAILED'
                }
            });

            const activeCalls = await db.Call.count({
                where: {
                    trunkId: id,
                    endTime: null
                }
            });

            return {
                trunk: {
                    id: trunk.id,
                    name: trunk.name,
                    provider: trunk.provider,
                    status: trunk.status
                },
                stats: {
                    totalCalls: trunk.totalCalls || totalCalls,
                    successfulCalls: trunk.successfulCalls || successfulCalls,
                    failedCalls: trunk.failedCalls || failedCalls,
                    activeCalls,
                    successRate: totalCalls > 0 ? ((successfulCalls / totalCalls) * 100).toFixed(2) : 0
                }
            };
        } catch (error) {
            logger.error('Error obteniendo estadísticas de trunk', {
                id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Probar conexión de trunk (ping)
     */
    async testTrunkConnection(id) {
        try {
            const trunk = await Trunk.findByPk(id);

            if (!trunk) {
                throw new Error(`Trunk con ID ${id} no encontrado`);
            }

            // Aquí se implementaría lógica para probar conexión real
            // Por ahora retornamos simulación
            logger.info('Probando conexión de trunk', {
                trunkId: id,
                host: trunk.host,
                port: trunk.port
            });

            return {
                success: true,
                message: 'Conexión exitosa (simulada)',
                trunk: trunk.name
            };
        } catch (error) {
            logger.error('Error probando conexión de trunk', {
                id,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * Actualizar configuración de Asterisk (privado)
     */
    async _updateAsteriskConfig(trunk) {
        // Esta función actualizaría el archivo pjsip.conf de Asterisk
        // Por ahora solo log
        logger.info('Actualización de configuración Asterisk pendiente', {
            trunkId: trunk.id,
            name: trunk.name
        });

        // TODO: Implementar actualización real via AMI o archivo
        // Ejemplo:
        // - Generar sección [trunk-name] en pjsip.conf
        // - Recargar configuración: asterisk -rx "pjsip reload"
    }
}

export default new TrunkService();
