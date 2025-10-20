import bcrypt from 'bcrypt';
import db from '../models/index.js';
import { MESSAGES } from '../config/constants.js';

const User = db.User;

/**
 * Servicio de Autenticación
 * Maneja toda la lógica de negocio relacionada con autenticación
 */
class AuthService {
    /**
     * Autenticar usuario con email y contraseña
     * @param {string} correo - Email del usuario
     * @param {string} contrasena - Contraseña en texto plano
     * @returns {Object} Usuario autenticado o null
     */
    async login(correo, contrasena) {
        try {
            // Buscar usuario por correo
            const usuario = await User.findOne({
                where: { correo },
                attributes: ['id', 'correo', 'contrasena', 'rol', 'estado', 'username']
            });

            // Validar existencia y estado
            if (!usuario) {
                throw new Error(MESSAGES.ERROR.LOGIN_INVALID_CREDENTIALS);
            }

            if (!usuario.estado) {
                throw new Error(MESSAGES.ERROR.LOGIN_ACCOUNT_INACTIVE);
            }

            // Verificar contraseña
            const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena);

            if (!contrasenaValida) {
                throw new Error(MESSAGES.ERROR.LOGIN_INVALID_CREDENTIALS);
            }

            // Retornar usuario sin contraseña
            return {
                id: usuario.id,
                correo: usuario.correo,
                username: usuario.username,
                rol: usuario.rol
            };

        } catch (error) {
            throw error;
        }
    }

    /**
     * Crear sesión para usuario autenticado
     * @param {Object} req - Request object de Express
     * @param {Object} usuario - Datos del usuario
     */
    createSession(req, usuario) {
        req.session.usuario = {
            id: usuario.id,
            correo: usuario.correo,
            username: usuario.username,
            rol: usuario.rol
        };
    }

    /**
     * Destruir sesión de usuario
     * @param {Object} req - Request object de Express
     */
    async logout(req) {
        return new Promise((resolve, reject) => {
            req.session.destroy((err) => {
                if (err) {
                    reject(new Error(MESSAGES.ERROR.SERVER_ERROR));
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Verificar si usuario está autenticado
     * @param {Object} req - Request object de Express
     * @returns {boolean}
     */
    isAuthenticated(req) {
        return !!(req.session && req.session.usuario);
    }

    /**
     * Verificar si usuario tiene rol específico
     * @param {Object} req - Request object de Express
     * @param {string} rol - Rol requerido
     * @returns {boolean}
     */
    hasRole(req, rol) {
        return req.session?.usuario?.rol === rol;
    }
}

export default new AuthService();
