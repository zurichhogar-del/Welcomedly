/**
 * Authentication Routes con JWT
 * Enterprise-grade authentication endpoints
 */

import express from 'express';
import bcrypt from 'bcrypt';
import { body, validationResult } from 'express-validator';
import db from '../models/index.js';
import jwtService from '../services/jwtService.js';
import { generateCSRFToken } from '../middlewares/csrfMiddleware.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Autenticación con JWT tokens
 */
router.post('/login', [
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Contraseña requerida')
], async (req, res) => {
    try {
        // Validar datos de entrada
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'VALIDATION_ERROR',
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        // Buscar usuario con rol activo
        const user = await db.Usuario.findOne({
            where: { email, activo: true },
            attributes: ['id', 'email', 'password', 'rol', 'nombre', 'ultimoLogin']
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'CREDENCIALES_INVALIDAS',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Verificar contraseña
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'CREDENCIALES_INVALIDAS',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Generar tokens
        const tokens = await jwtService.generateTokenPair(user);

        // Actualizar último login
        await db.Usuario.update(
            {
                ultimoLogin: new Date(),
                sessionInfo: {
                    sessionId: tokens.sessionId,
                    loginTime: new Date(),
                    userAgent: req.headers['user-agent'],
                    ip: req.ip
                }
            },
            { where: { id: user.id } }
        );

        // Generar CSRF token para session web
        const csrfToken = generateCSRFToken();

        res.json({
            success: true,
            message: 'LOGIN_SUCCESSFUL',
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    nombre: user.nombre,
                    rol: user.rol,
                    ultimoLogin: user.ultimoLogin
                },
                tokens,
                csrfToken
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'LOGIN_FAILED',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * POST /api/auth/refresh
 * Refrescar access token
 */
router.post('/refresh', jwtService.handleRefreshToken());

/**
 * POST /api/auth/logout
 * Cerrar sesión
 */
router.post('/logout', jwtService.handleLogout());

/**
 * GET /api/auth/me
 * Obtener información del usuario actual
 */
router.get('/me', jwtService.authenticateToken(), async (req, res) => {
    try {
        const user = await db.Usuario.findByPk(req.user.id, {
            attributes: ['id', 'email', 'nombre', 'rol', 'ultimoLogin', 'createdAt']
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'USER_NOT_FOUND',
                code: 'NOT_FOUND'
            });
        }

        res.json({
            success: true,
            data: {
                user: user.toJSON(),
                sessionId: req.user.sessionId
            }
        });

    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            message: 'GET_USER_FAILED',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * POST /api/auth/logout-all
 * Cerrar todas las sesiones del usuario
 */
router.post('/logout-all', jwtService.authenticateToken(), (req, res) => {
    try {
        const result = jwtService.revokeAllUserTokens(req.user.id);

        res.json({
            success: true,
            message: 'ALL_SESSIONS_REVOKED',
            data: result
        });

    } catch (error) {
        console.error('Logout all error:', error);
        res.status(500).json({
            success: false,
            message: 'LOGOUT_ALL_FAILED',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * GET /api/auth/sessions
 * Obtener sesiones activas del usuario (admin only)
 */
router.get('/sessions', [
    jwtService.authenticateToken(),
    jwtService.requireRole('ADMIN')
], async (req, res) => {
    try {
        const stats = jwtService.getTokenStats();

        res.json({
            success: true,
            data: {
                tokenStats: stats,
                message: 'SESSION_STATS_RETRIEVED'
            }
        });

    } catch (error) {
        console.error('Sessions error:', error);
        res.status(500).json({
            success: false,
            message: 'SESSIONS_ERROR',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * POST /api/auth/verify-token
 * Verificar validez de token
 */
router.post('/verify-token', jwtService.authenticateToken(), (req, res) => {
    res.json({
        success: true,
        message: 'TOKEN_VALID',
        data: {
            user: req.user,
            sessionId: req.user.sessionId
        }
    });
});

/**
 * POST /api/auth/change-password
 * Cambiar contraseña (autenticado)
 */
router.post('/change-password', [
    jwtService.authenticateToken(),
    body('currentPassword').notEmpty().withMessage('Contraseña actual requerida'),
    body('newPassword').isLength({ min: 8 }).withMessage('Nueva contraseña debe tener al menos 8 caracteres'),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.newPassword) {
            throw new Error('Las contraseñas no coinciden');
        }
        return true;
    })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'VALIDATION_ERROR',
                errors: errors.array()
            });
        }

        const { currentPassword, newPassword } = req.body;

        // Obtener usuario con contraseña
        const user = await db.Usuario.findByPk(req.user.id, {
            attributes: ['id', 'password']
        });

        // Verificar contraseña actual
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: 'CURRENT_PASSWORD_INVALID',
                code: 'INVALID_PASSWORD'
            });
        }

        // Hashear nueva contraseña
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Actualizar contraseña
        await db.Usuario.update(
            { password: hashedPassword },
            { where: { id: user.id } }
        );

        // Revocar todos los tokens excepto el actual
        // Esto fuerza a re-login en otros dispositivos
        jwtService.revokeAllUserTokens(user.id);

        res.json({
            success: true,
            message: 'PASSWORD_CHANGED_SUCCESSFULLY',
            data: {
                requiresReLogin: true
            }
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'PASSWORD_CHANGE_FAILED',
            code: 'INTERNAL_ERROR'
        });
    }
});

export default router;