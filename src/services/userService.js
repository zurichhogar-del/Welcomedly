import db from '../models/index.js';
import { MESSAGES, CONFIG } from '../config/constants.js';

const User = db.User;

/**
 * Servicio de Usuarios/Agentes
 * Maneja toda la lógica de negocio relacionada con usuarios
 */
class UserService {
    /**
     * Crear nuevo usuario/agente
     * @param {Object} userData - Datos del usuario
     * @returns {Object} Usuario creado
     */
    async createUser(userData) {
        try {
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

            // Retornar sin contraseña
            const { contrasena, ...userWithoutPassword } = newUser.toJSON();
            return userWithoutPassword;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Obtener todos los agentes
     * @param {Object} filters - Filtros opcionales
     * @returns {Array} Lista de agentes
     */
    async getAllAgents(filters = {}) {
        try {
            const where = { rol: CONFIG.ROLES.AGENT };

            // Aplicar filtros adicionales si existen
            if (filters.estado !== undefined) {
                where.estado = filters.estado;
            }

            const agentes = await User.findAll({
                where,
                attributes: { exclude: ['contrasena'] },
                order: [['createdAt', 'DESC']]
            });

            return agentes;

        } catch (error) {
            throw new Error(MESSAGES.ERROR.SERVER_ERROR);
        }
    }

    /**
     * Obtener agentes activos (para asignación a campañas)
     * @returns {Array} Lista de agentes activos
     */
    async getActiveAgents() {
        try {
            const agentes = await User.findAll({
                where: {
                    rol: CONFIG.ROLES.AGENT,
                    estado: CONFIG.STATUS.ACTIVE
                },
                attributes: ['id', 'primerNombre', 'primerApellido'],
                order: [['primerNombre', 'ASC']]
            });

            return agentes;

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
     * @param {number} id - ID del usuario
     */
    async deleteUser(id) {
        try {
            const deleted = await User.destroy({ where: { id } });

            if (!deleted) {
                throw new Error(MESSAGES.ERROR.AGENT_NOT_FOUND);
            }

            return true;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Cambiar estado de usuario (activo/inactivo)
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

            return user;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Actualizar datos de usuario
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
