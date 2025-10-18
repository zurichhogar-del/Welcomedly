import authService from '../services/authService.js';
import { MESSAGES } from '../config/constants.js';

export function mostrarLogin(req, res) {
    res.render("authViews/login", {
        layout: 'layouts/authLayout',
    });
}

export function mostrarOlvidoContrasena(req, res) {
    res.render("authViews/olvido_contraseña", {
        layout: 'layouts/authLayout',
    });
}

export function mostrarRegistro(req, res) {
    res.render("authViews/registrarse_nuevo", {
        layout: 'layouts/authLayout',
    });
}

/**
 * Procesar login de usuario
 */
export async function loginUsuario(req, res) {
    const { correo, contrasena } = req.body;

    try {
        // Usar servicio de autenticación
        const usuario = await authService.login(correo, contrasena);

        // Crear sesión
        authService.createSession(req, usuario);

        req.session.mensajeExito = MESSAGES.SUCCESS.LOGIN_SUCCESS(usuario.username);
        res.redirect("/market/market");

    } catch (error) {
        console.error("Error en login:", error);
        req.session.swalError = error.message || MESSAGES.ERROR.LOGIN_FAILED;
        res.redirect('/auth/login');
    }
}

/**
 * Cerrar sesión de usuario
 */
export async function logoutUsuario(req, res) {
    try {
        await authService.logout(req);
        res.redirect("/auth/login");
    } catch (error) {
        console.error("❌ Error al cerrar sesión:", error);
        req.session.swalError = "Error al cerrar sesión";
        res.redirect("/auth/login");
    }
}