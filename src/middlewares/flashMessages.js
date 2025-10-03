export function flashMessages(req, res, next) {
    if (req.session) {
        res.locals.swalError = req.session.swalError || null;
        res.locals.mensajeExito = req.session.mensajeExito || null;
    
        // Limpiar después de usar
        req.session.swalError = null;
        req.session.mensajeExito = null;
    }
    
    next();
}