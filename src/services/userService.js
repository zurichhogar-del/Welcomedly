import db from '../models/index.js';
import { MESSAGES, CONFIG } from '../config/constants.js';
import cacheService from './cacheService.js'; // Sprint 2.1: Caché Redis

const User = db.User;

/**
 * Servicio de Usuarios/Agentes
 * Maneja toda la lógica de negocio relacionada con usuarios
 */
class UserService {
    /**
     * Crear nuevo usuario/agente
     * Sprint 2.1: Invalida caché después de crear
     * @param {Object} userData - Datos del usuario
     * @returns {Object} Usuario creado
     */
    async createUser(userData) {
        try { // Error handling wrapper - try...catch block
            // Verificar si el usuario ya existe
            const existingUser = await User.findOne({
                where: { username: userData.username }
            });

            if (existingUser) {
                throw new Error(MESSAGES.ERROR.AGENT_ALREADY_EXISTS);
            }

            // Crear usuario (el hook beforeCreate hashea la contraseña)
            const newUser = await User.create({
                primerNombre: userData.primer_nombre,
                segundoNombre: userData.segundo_nombre,
                primerApellido: userData.primer_apellido,
                segundoApellido: userData.segundo_apellido,
                identificacion: userData.identificacion,
                correo: userData.correo,
                username: userData.username,
                contrasena: userData.password,
                rol: userData.rol
            });

            // Sprint 2.1: Invalidar caché de usuarios
            await cacheService.invalidateUser(newUser.id);
            await cacheService.delPattern('cache:user:agents*');

            // Retornar sin contraseña
            const { contrasena, ...userWithoutPassword } = newUser.toJSON();
            return userWithoutPassword;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Obtener todos los agentes
     * Sprint 2.1: Con caché Redis (5 min TTL)
     * @param {Object} filters - Filtros opcionales
     * @returns {Array} Lista de agentes
     */
    async getAllAgents(filters = {}) {
        try { // Error handling wrapper - try...catch block
            const where = { rol: CONFIG.ROLES.AGENT };

            // Aplicar filtros adicionales si existen
            if (filters.estado !== undefined) {
                where.estado = filters.estado;
            }

            // Generar clave de caché basada en filtros
            const cacheKey = `cache:user:agents:${JSON.stringify(filters)}`;

            return await cacheService.wrap(cacheKey, async () => {
                const agentes = await User.findAll({
                    where,
                    attributes: { exclude: ['contrasena'] },
                    order: [['createdAt', 'DESC']]
                });

                return agentes;
            }, 300); // TTL: 5 minutos

        } catch (error) {
            throw new Error(MESSAGES.ERROR.SERVER_ERROR);
        }
    }

    /**
     * Obtener agentes activos (para asignación a campañas)
     * Sprint 2.1: Con caché Redis (10 min TTL)
     * @returns {Array} Lista de agentes activos
     */
    async getActiveAgents() {
        try {
            const cacheKey = 'cache:user:agents:active';

            return await cacheService.wrap(cacheKey, async () => {
                const agentes = await User.findAll({
                    where: {
                        rol: CONFIG.ROLES.AGENT,
                        estado: CONFIG.STATUS.ACTIVE
                    },
                    attributes: ['id', 'primerNombre', 'primerApellido'],
                    order: [['primerNombre', 'ASC']]
                });

                return agentes;
            }, 600); // TTL: 10 minutos (datos relativamente estables)

        } catch (error) {
            throw new Error(MESSAGES.ERROR.SERVER_ERROR);
        }
    }

    /**
     * Obtener usuario por ID
     * @param {number} id - ID del usuario
     * @returns {Object} Usuario encontrado
     */
    async getUserById(id) {
        try {
            const user = await User.findByPk(id, {
                attributes: { exclude: ['contrasena'] }
            });

            if (!user) {
                throw new Error(MESSAGES.ERROR.AGENT_NOT_FOUND);
            }

            return user;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Eliminar usuario
     * Sprint 2.1: Invalida caché después de eliminar
     * @param {number} id - ID del usuario
     */
    async deleteUser(id) {
        try {
            const deleted = await User.destroy({ where: { id } });

            if (!deleted) {
                throw new Error(MESSAGES.ERROR.AGENT_NOT_FOUND);
            }

            // Sprint 2.1: Invalidar caché de usuarios
            await cacheService.invalidateUser(id);
            await cacheService.delPattern('cache:user:agents*');

            return true;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Cambiar estado de usuario (activo/inactivo)
     * Sprint 2.1: Invalida caché después de cambiar estado
     * @param {number} id - ID del usuario
     * @returns {Object} Usuario actualizado
     */
    async toggleUserStatus(id) {
        try {
            const user = await User.findByPk(id);

            if (!user) {
                throw new Error(MESSAGES.ERROR.AGENT_NOT_FOUND);
            }

            user.estado = !user.estado;
            await user.save();

            // Sprint 2.1: Invalidar caché de usuarios
            await cacheService.invalidateUser(id);
            await cacheService.delPattern('cache:user:agents*');

            return user;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Actualizar datos de usuario
     * Sprint 2.1: Invalida caché después de actualizar
     * @param {number} id - ID del usuario
     * @param {Object} updateData - Datos a actualizar
     * @returns {Object} Usuario actualizado
     */
    async updateUser(id, updateData) {
        try {
            const user = await User.findByPk(id);

            if (!user) {
                throw new Error(MESSAGES.ERROR.AGENT_NOT_FOUND);
            }

            await user.update(updateData);

            // Sprint 2.1: Invalidar caché de usuarios
            await cacheService.invalidateUser(id);
            await cacheService.delPattern('cache:user:agents*');

            const { contrasena, ...userWithoutPassword } = user.toJSON();
            return userWithoutPassword;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Contar usuarios por rol
     * @param {string} rol - Rol a contar
     * @returns {number} Cantidad de usuarios
     */
    async countByRole(rol) {
        try {
            return await User.count({ where: { rol } });
        } catch (error) {
            throw new Error(MESSAGES.ERROR.SERVER_ERROR);
        }
    }
}

export default new UserService();
