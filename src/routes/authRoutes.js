import { Router } from "express";
import {
    mostrarLogin,
    mostrarOlvidoContrasena,
    mostrarRegistro,
    loginUsuario,
    logoutUsuario
} from "../controllers/authController.js";
import { loginLimiter } from "../middlewares/securityMiddleware.js";

const router = Router();

// Middleware para layout y headers de seguridad
router.use((req, res, next) => {
    res.locals.layout = 'layouts/authLayout';
    res.header('Cache-Control', 'no-store, max-age=0');
    next();
});

// Middleware para rutas que requieren NO estar autenticado
const soloInvitados = (req, res, next) => {
    if (req.session.usuario) {
        req.flash('error', 'Ya tienes una sesión activa');
        return res.redirect('/market/market');
    }
    next();
};


router.use(soloInvitados);

// Rutas
router.get("/login", mostrarLogin);
// router.post("/login", loginLimiter, loginUsuario); // Proteger login con rate limiting (temporalmente desactivado)
router.post("/login", loginUsuario);
router.get("/olvido-contrasena", mostrarOlvidoContrasena);
router.get("/registrarse", mostrarRegistro);

// ✅ Logout como POST (más seguro)
router.post("/logout", logoutUsuario);

export default router;