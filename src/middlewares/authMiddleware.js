// middlewares/authMiddleware.js

export const asegurarAutenticacion = (req, res, next) => {
    if (req.session && req.session.usuario) {
      req.user = req.session.usuario; // <--- Esto es lo que falta
        return next();
    }
    return res.redirect('/auth/login');
};