import crypto from 'crypto';

/**
 * Generar token CSRF seguro
 * @returns {string} Token CSRF de 32 bytes en hexadecimal
 */
export function generateCSRFToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Middleware para protección CSRF
 * Almacena el token en la sesión y lo valida en peticiones POST/PUT/DELETE
 */
export function csrfProtection(req, res, next) {
    // Ignorar rutas GET, HEAD, OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Obtener token de la sesión
    const sessionToken = req.session.csrfToken;

    // Obtener token del request (header o body)
    const requestToken = req.body._csrf || req.headers['x-csrf-token'];

    if (!sessionToken || !requestToken || sessionToken !== requestToken) {
        // Token inválido o ausente
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(403).json({
                success: false,
                message: 'Token CSRF inválido'
            });
        } else {
            req.session.swalError = '❌ Token de seguridad inválido. Por favor, intenta nuevamente.';
            return res.redirect(req.headers.referer || '/market/market');
        }
    }

    // Regenerar token después de uso válido (one-time use)
    req.session.csrfToken = generateCSRFToken();
    next();
}

/**
 * Middleware para inyectar token CSRF en las vistas
 */
export function injectCSRFToken(req, res, next) {
    // Generar token si no existe
    if (!req.session.csrfToken) {
        req.session.csrfToken = generateCSRFToken();
    }

    // Disponibilizar token para las vistas
    res.locals.csrfToken = req.session.csrfToken;
    next();
}

/**
 * Middleware de seguridad para cookies de sesión
 */
export function secureSessionCookie(req, res, next) {
    // Configuración segura para cookies
    if (process.env.NODE_ENV === 'production') {
        req.session.cookie.secure = true; // HTTPS only
        req.session.cookie.httpOnly = true; // No accesible via JavaScript
        req.session.cookie.sameSite = 'strict'; // Protección contra CSRF
    }

    req.session.cookie.maxAge = 30 * 60 * 1000; // 30 minutos
    next();
}

/**
 * Validar token CSRF para AJAX requests
 */
export function validateCSRFToken(req, res, next) {
    const sessionToken = req.session.csrfToken;
    const requestToken = req.headers['x-csrf-token'];

    if (!sessionToken || !requestToken || sessionToken !== requestToken) {
        return res.status(403).json({
            success: false,
            message: 'Token CSRF inválido'
        });
    }

    // Regenerar token
    req.session.csrfToken = generateCSRFToken();
    res.locals.csrfToken = req.session.csrfToken;
    next();
}