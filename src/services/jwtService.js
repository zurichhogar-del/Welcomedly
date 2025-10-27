/**
 * JWT Authentication Service
 * Enterprise-grade authentication con refresh tokens
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../models/index.js';

class JWTService {
    constructor() {
        this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || this.generateSecret();
        this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || this.generateSecret();
        this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
        this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';

        // In-memory store para refresh tokens (producción: Redis)
        this.refreshTokens = new Map();

        console.log('🔐 JWT Service initialized with enterprise-grade security');
    }

    generateSecret() {
        return crypto.randomBytes(64).toString('hex');
    }

    /**
     * Generar par de tokens (access + refresh)
     */
    async generateTokenPair(user) {
        const payload = {
            userId: user.id,
            email: user.email,
            rol: user.rol,
            sessionId: crypto.randomUUID()
        };

        const accessToken = jwt.sign(payload, this.accessTokenSecret, {
            expiresIn: this.accessTokenExpiry,
            issuer: 'welcomedly.com',
            audience: 'welcomedly-app'
        });

        const refreshToken = jwt.sign(
            { userId: user.id, sessionId: payload.sessionId },
            this.refreshTokenSecret,
            { expiresIn: this.refreshTokenExpiry }
        );

        // Almacenar refresh token
        this.refreshTokens.set(refreshToken, {
            userId: user.id,
            sessionId: payload.sessionId,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + this.parseExpiry(this.refreshTokenExpiry))
        });

        // Limpiar tokens expirados
        this.cleanExpiredTokens();

        return {
            accessToken,
            refreshToken,
            expiresIn: this.parseExpiry(this.accessTokenExpiry),
            tokenType: 'Bearer',
            sessionId: payload.sessionId
        };
    }

    /**
     * Verificar access token
     */
    verifyAccessToken(token) {
        try {
            return jwt.verify(token, this.accessTokenSecret, {
                issuer: 'welcomedly.com',
                audience: 'welcomedly-app'
            });
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('ACCESS_TOKEN_EXPIRED');
            } else if (error.name === 'JsonWebTokenError') {
                throw new Error('INVALID_ACCESS_TOKEN');
            }
            throw new Error('TOKEN_VERIFICATION_FAILED');
        }
    }

    /**
     * Refrescar access token usando refresh token
     */
    async refreshAccessToken(refreshToken) {
        try {
            // Verificar refresh token
            const decoded = jwt.verify(refreshToken, this.refreshTokenSecret);

            // Verificar que el refresh token esté en el store
            const tokenData = this.refreshTokens.get(refreshToken);
            if (!tokenData) {
                throw new Error('REFRESH_TOKEN_NOT_FOUND');
            }

            // Verificar que no haya expirado
            if (new Date() > tokenData.expiresAt) {
                this.refreshTokens.delete(refreshToken);
                throw new Error('REFRESH_TOKEN_EXPIRED');
            }

            // Obtener usuario actualizado
            const user = await db.Usuario.findByPk(decoded.userId);
            if (!user || !user.activo) {
                throw new Error('USER_NOT_FOUND_OR_INACTIVE');
            }

            // Generar nuevo par de tokens
            const newTokens = await this.generateTokenPair(user);

            // Eliminar refresh token antiguo
            this.refreshTokens.delete(refreshToken);

            return {
                ...newTokens,
                message: 'TOKEN_REFRESHED_SUCCESSFULLY'
            };

        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                this.refreshTokens.delete(refreshToken);
                throw new Error('REFRESH_TOKEN_EXPIRED');
            } else if (error.name === 'JsonWebTokenError') {
                throw new Error('INVALID_REFRESH_TOKEN');
            }
            throw error;
        }
    }

    /**
     * Revocar refresh token (logout)
     */
    revokeRefreshToken(refreshToken) {
        const deleted = this.refreshTokens.delete(refreshToken);
        return {
            success: deleted,
            message: deleted ? 'TOKEN_REVOKED' : 'TOKEN_NOT_FOUND'
        };
    }

    /**
     * Revocar todos los tokens de un usuario
     */
    revokeAllUserTokens(userId) {
        let revokedCount = 0;
        for (const [token, data] of this.refreshTokens.entries()) {
            if (data.userId === userId) {
                this.refreshTokens.delete(token);
                revokedCount++;
            }
        }
        return {
            revokedCount,
            message: `Revoked ${revokedCount} tokens for user ${userId}`
        };
    }

    /**
     * Limpiar tokens expirados
     */
    cleanExpiredTokens() {
        const now = new Date();
        let cleanedCount = 0;

        for (const [token, data] of this.refreshTokens.entries()) {
            if (now > data.expiresAt) {
                this.refreshTokens.delete(token);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned ${cleanedCount} expired tokens`);
        }
    }

    /**
     * Parse expiry string to milliseconds
     */
    parseExpiry(expiry) {
        const units = {
            's': 1000,
            'm': 60 * 1000,
            'h': 60 * 60 * 1000,
            'd': 24 * 60 * 60 * 1000
        };

        const match = expiry.match(/^(\d+)([smhd])$/);
        if (!match) {return 15 * 60 * 1000;} // Default 15 minutes

        const [, amount, unit] = match;
        return parseInt(amount) * units[unit];
    }

    /**
     * Obtener información del token sin verificar firma (debugging)
     */
    decodeToken(token) {
        return jwt.decode(token, { complete: true });
    }

    /**
     * Verificar estado de sesión
     */
    async checkSessionStatus(sessionId) {
        for (const [token, data] of this.refreshTokens.entries()) {
            if (data.sessionId === sessionId) {
                return {
                    active: true,
                    expiresAt: data.expiresAt,
                    createdAt: data.createdAt
                };
            }
        }
        return { active: false };
    }

    /**
     * Middleware para proteger rutas con JWT
     */
    authenticateToken() {
        return async (req, res, next) => {
            try {
                const authHeader = req.headers.authorization;
                const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

                if (!token) {
                    return res.status(401).json({
                        success: false,
                        message: 'ACCESS_TOKEN_REQUIRED',
                        code: 'TOKEN_MISSING'
                    });
                }

                const decoded = this.verifyAccessToken(token);

                // Obtener usuario actualizado
                const user = await db.Usuario.findByPk(decoded.userId);
                if (!user || !user.activo) {
                    return res.status(401).json({
                        success: false,
                        message: 'USER_NOT_FOUND_OR_INACTIVE',
                        code: 'USER_INVALID'
                    });
                }

                // Verificar que la sesión esté activa
                const sessionStatus = await this.checkSessionStatus(decoded.sessionId);
                if (!sessionStatus.active) {
                    return res.status(401).json({
                        success: false,
                        message: 'SESSION_EXPIRED',
                        code: 'SESSION_INVALID'
                    });
                }

                // Adjuntar información del usuario al request
                req.user = {
                    id: user.id,
                    email: user.email,
                    rol: user.rol,
                    sessionId: decoded.sessionId
                };

                next();

            } catch (error) {
                console.error('JWT Authentication error:', error.message);

                let message = 'AUTHENTICATION_FAILED';
                let code = 'AUTH_ERROR';

                if (error.message === 'ACCESS_TOKEN_EXPIRED') {
                    message = 'ACCESS_TOKEN_EXPIRED';
                    code = 'TOKEN_EXPIRED';
                } else if (error.message === 'INVALID_ACCESS_TOKEN') {
                    message = 'INVALID_ACCESS_TOKEN';
                    code = 'TOKEN_INVALID';
                }

                return res.status(401).json({
                    success: false,
                    message,
                    code,
                    requiresRefresh: error.message === 'ACCESS_TOKEN_EXPIRED'
                });
            }
        };
    }

    /**
     * Middleware para verificar roles
     */
    requireRole(allowedRoles) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'AUTHENTICATION_REQUIRED',
                    code: 'NOT_AUTHENTICATED'
                });
            }

            const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

            if (!roles.includes(req.user.rol)) {
                return res.status(403).json({
                    success: false,
                    message: 'INSUFFICIENT_PERMISSIONS',
                    code: 'ROLE_FORBIDDEN',
                    required: roles,
                    current: req.user.rol
                });
            }

            next();
        };
    }

    /**
     * Endpoint para refresh token
     */
    handleRefreshToken() {
        return async (req, res) => {
            try {
                const { refreshToken } = req.body;

                if (!refreshToken) {
                    return res.status(400).json({
                        success: false,
                        message: 'REFRESH_TOKEN_REQUIRED',
                        code: 'REFRESH_TOKEN_MISSING'
                    });
                }

                const result = await this.refreshAccessToken(refreshToken);

                res.json({
                    success: true,
                    message: result.message,
                    data: {
                        accessToken: result.accessToken,
                        refreshToken: result.refreshToken,
                        expiresIn: result.expiresIn,
                        tokenType: result.tokenType
                    }
                });

            } catch (error) {
                console.error('Token refresh error:', error.message);

                let message = 'TOKEN_REFRESH_FAILED';
                let statusCode = 400;

                if (error.message === 'REFRESH_TOKEN_EXPIRED' ||
                    error.message === 'REFRESH_TOKEN_NOT_FOUND') {
                    message = 'REFRESH_TOKEN_INVALID';
                    statusCode = 401;
                }

                res.status(statusCode).json({
                    success: false,
                    message,
                    code: 'REFRESH_FAILED',
                    details: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        };
    }

    /**
     * Endpoint para logout
     */
    handleLogout() {
        return async (req, res) => {
            try {
                const { refreshToken } = req.body;

                if (refreshToken) {
                    this.revokeRefreshToken(refreshToken);
                }

                res.json({
                    success: true,
                    message: 'LOGOUT_SUCCESSFUL'
                });

            } catch (error) {
                console.error('Logout error:', error.message);

                res.status(500).json({
                    success: false,
                    message: 'LOGOUT_FAILED',
                    code: 'LOGOUT_ERROR'
                });
            }
        };
    }

    /**
     * Obtener estadísticas de tokens
     */
    getTokenStats() {
        const now = new Date();
        let activeTokens = 0;
        let expiredTokens = 0;

        for (const [token, data] of this.refreshTokens.entries()) {
            if (now < data.expiresAt) {
                activeTokens++;
            } else {
                expiredTokens++;
            }
        }

        return {
            totalRefreshTokens: this.refreshTokens.size,
            activeTokens,
            expiredTokens,
            memoryUsage: process.memoryUsage()
        };
    }
}

export default new JWTService();