// middlewares/authMiddleware.js

export const asegurarAutenticacion = (req, res, next) => {
    if (req.session && req.session.usuario) {
        req.user = req.session.usuario; // Estandarizar usando req.user
        return next();
    }
    return res.redirect('/auth/login');
};

// Middleware para verificar rol de administrador
export const asegurarAdmin = (req, res, next) => {
    if (req.session && req.session.usuario && req.session.usuario.rol === 'ADMIN') {
        req.user = req.session.usuario;
        return next();
    }
    return res.redirect('/auth/login');
};

// Middleware para verificar rol de agente
export const asegurarAgente = (req, res, next) => {
    if (req.session && req.session.usuario && req.session.usuario.rol === 'AGENTE') {
        req.user = req.session.usuario;
        return next();
    }
    return res.redirect('/auth/login');
};