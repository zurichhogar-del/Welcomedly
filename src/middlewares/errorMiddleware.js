import createError from 'http-errors';

// Middleware para manejar errores 404 (rutas no encontradas)
export const notFoundHandler = (req, res, next) => {
    next(createError(404, `Ruta no encontrada - ${req.originalUrl}`));
};

// Middleware centralizado de manejo de errores
export const errorHandler = (err, req, res, next) => {
    const statusCode = err.status || err.statusCode || 500;
    const isProduction = process.env.NODE_ENV === 'production';

    // Log del error (en desarrollo mostramos más detalles)
    console.error('Error capturado:', {
        message: err.message,
        stack: isProduction ? '🔒 Hidden in production' : err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        timestamp: new Date().toISOString()
    });

    // Determinar tipo de respuesta (JSON vs HTML)
    const acceptsHtml = req.accepts('html');
    const acceptsJson = req.accepts('json');

    // Si es una petición AJAX/API, responder con JSON
    if (acceptsJson && !acceptsHtml) {
        return res.status(statusCode).json({
            success: false,
            message: err.message || 'Error interno del servidor',
            ...(isProduction ? {} : { stack: err.stack })
        });
    }

    // Si es una petición web normal, guardar mensaje en sesión y redirigir
    if (req.session) {
        req.session.swalError = err.message || 'Ocurrió un error inesperado';
    }

    // Redirigir según el tipo de error
    if (statusCode === 404) {
        return res.status(404).render('error', {
            layout: 'layouts/authLayout',
            errorCode: 404,
            errorMessage: 'Página no encontrada',
            errorDetails: isProduction ? '' : err.stack
        });
    }

    // Para otros errores, intentar volver a la página anterior o al inicio
    const referer = req.get('Referer') || '/auth/login';
    return res.redirect(referer);
};

// Middleware para validar errores de Sequelize
export const sequelizeErrorHandler = (err, req, res, next) => {
    // Errores de validación de Sequelize
    if (err.name === 'SequelizeValidationError') {
        const errors = err.errors.map(e => e.message);
        err.message = `Errores de validación: ${errors.join(', ')}`;
        err.status = 400;
    }

    // Errores de unicidad
    if (err.name === 'SequelizeUniqueConstraintError') {
        err.message = 'Ya existe un registro con estos datos';
        err.status = 409;
    }

    // Errores de clave foránea
    if (err.name === 'SequelizeForeignKeyConstraintError') {
        err.message = 'No se puede realizar la operación: referencia datos que no existen';
        err.status = 400;
    }

    next(err);
};
