import db from '../models/index.js';

// Middleware to check if user has specific role
export const requireRole = (roles) => {
    return async (req, res, next) => {
        try {
            if (!req.session || !req.session.userId) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Authentication required' 
                });
            }

            const user = await db.User.findByPk(req.session.userId);
            if (!user) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'User not found' 
                });
            }

            const allowedRoles = Array.isArray(roles) ? roles : [roles];
            if (!allowedRoles.includes(user.rol)) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Insufficient permissions' 
                });
            }

            req.user = user;
            next();
        } catch (error) {
            console.error('Role middleware error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    };
};

// Middleware to check if user has specific permission
export const requirePermission = (permission) => {
    return async (req, res, next) => {
        try {
            if (!req.session || !req.session.userId) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Authentication required' 
                });
            }

            const user = await db.User.findByPk(req.session.userId);
            if (!user) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'User not found' 
                });
            }

            const hasPermission = await user.hasPermission(permission);
            if (!hasPermission) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Insufficient permissions' 
                });
            }

            req.user = user;
            next();
        } catch (error) {
            console.error('Permission middleware error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Internal server error' 
            });
        }
    };
};

// Middleware for operations role specific routes
export const requireOperations = requireRole(['ADMIN', 'OPERATIONS']);

// Middleware for admin only routes
export const requireAdmin = requireRole(['ADMIN']);

// Middleware to make user available in templates
export const setUserInTemplate = async (req, res, next) => {
    try {
        if (req.session && req.session.userId) {
            const user = await db.User.findByPk(req.session.userId, {
                attributes: { exclude: ['contrasena'] }
            });
            if (user) {
                res.locals.user = user;
                res.locals.isLoggedIn = true;
            } else {
                res.locals.isLoggedIn = false;
            }
        } else {
            res.locals.isLoggedIn = false;
        }
        next();
    } catch (error) {
        console.error('Set user in template error:', error);
        res.locals.isLoggedIn = false;
        next();
    }
};