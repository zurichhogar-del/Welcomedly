/**
 * JWT Authentication Middleware
 * Enterprise-grade middleware para rutas protegidas
 */

import jwtService from '../services/jwtService.js';

export const authenticateToken = jwtService.authenticateToken();
export const requireRole = jwtService.requireRole.bind(jwtService);
export const handleRefreshToken = jwtService.handleRefreshToken();
export const handleLogout = jwtService.handleLogout();

/**
 * Middleware opcional para JWT (no lanza error si no hay token)
 */
export const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    try {
        const decoded = jwtService.verifyAccessToken(token);
        req.user = {
            id: decoded.userId,
            email: decoded.email,
            rol: decoded.rol,
            sessionId: decoded.sessionId
        };
    } catch (error) {
        req.user = null;
    }

    next();
};

/**
 * Middleware para verificar propietario de recursos
 */
export const requireOwnership = (resourceIdParam = 'id', resourceModel = null) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'AUTHENTICATION_REQUIRED',
                    code: 'NOT_AUTHENTICATED'
                });
            }

            // Los administradores tienen acceso a todo
            if (req.user.rol === 'ADMIN') {
                return next();
            }

            const resourceId = req.params[resourceIdParam];

            if (resourceModel) {
                // Verificar propiedad en base de datos
                const resource = await resourceModel.findByPk(resourceId);

                if (!resource) {
                    return res.status(404).json({
                        success: false,
                        message: 'RESOURCE_NOT_FOUND',
                        code: 'NOT_FOUND'
                    });
                }

                // Verificar que el recurso pertenezca al usuario
                if (resource.usuarioId && resource.usuarioId !== req.user.id) {
                    return res.status(403).json({
                        success: false,
                        message: 'ACCESS_DENIED',
                        code: 'NOT_OWNER'
                    });
                }
            }

            next();

        } catch (error) {
            console.error('Ownership verification error:', error);
            res.status(500).json({
                success: false,
                message: 'VERIFICATION_FAILED',
                code: 'INTERNAL_ERROR'
            });
        }
    };
};

export default {
    authenticateToken,
    requireRole,
    optionalAuth,
    requireOwnership,
    handleRefreshToken,
    handleLogout
};