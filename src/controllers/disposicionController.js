/**
 * Controlador de Disposiciones
 * Maneja las peticiones HTTP relacionadas con códigos de disposición de llamadas
 */

import disposicionService from '../services/disposicionService.js';
import { MESSAGES } from '../config/constants.js';

/**
 * Renderizar vista de gestión de disposiciones
 */
export async function mostrarDisposiciones(req, res) {
    try {
        const disposiciones = await disposicionService.getAllDisposiciones();

        res.render('disposiciones/lista-disposiciones', {
            layout: 'layouts/generalLayout',
            disposiciones,
            usuario: req.user || req.session.usuario,
            mensajeExito: req.session.mensajeExito,
            swalError: req.session.swalError
        });

        // Limpiar mensajes de sesión
        delete req.session.mensajeExito;
        delete req.session.swalError;

    } catch (error) {
        console.error('Error al mostrar disposiciones:', error);
        req.session.swalError = MESSAGES.ERROR.GENERAL;
        res.redirect('/market/market');
    }
}

/**
 * Renderizar formulario de creación de disposición
 */
export function mostrarFormularioCrear(req, res) {
    res.render('disposiciones/crear-disposicion', {
        layout: 'layouts/generalLayout',
        usuario: req.user || req.session.usuario,
        swalError: req.session.swalError
    });

    delete req.session.swalError;
}

/**
 * Crear nueva disposición
 */
export async function crearDisposicion(req, res) {
    try {
        const { nombre, descripcion, color, tipo, requiereCallback, orden } = req.body;

        await disposicionService.createDisposicion({
            nombre,
            descripcion,
            color,
            tipo,
            requiereCallback: requiereCallback === 'true' || requiereCallback === true,
            orden: parseInt(orden) || 0
        });

        req.session.mensajeExito = '✅ Disposición creada exitosamente';
        res.redirect('/disposiciones/lista');

    } catch (error) {
        console.error('Error al crear disposición:', error);
        req.session.swalError = error.message;
        res.redirect('/disposiciones/crear');
    }
}

/**
 * Renderizar formulario de edición de disposición
 */
export async function mostrarFormularioEditar(req, res) {
    try {
        const { id } = req.params;
        const disposicion = await disposicionService.getDisposicionById(id);

        res.render('disposiciones/editar-disposicion', {
            layout: 'layouts/generalLayout',
            disposicion,
            usuario: req.user || req.session.usuario,
            swalError: req.session.swalError
        });

        delete req.session.swalError;

    } catch (error) {
        console.error('Error al obtener disposición:', error);
        req.session.swalError = error.message;
        res.redirect('/disposiciones/lista');
    }
}

/**
 * Actualizar disposición
 */
export async function actualizarDisposicion(req, res) {
    try {
        const { id } = req.params;
        const { nombre, descripcion, color, tipo, requiereCallback, orden, activa } = req.body;

        await disposicionService.updateDisposicion(id, {
            nombre,
            descripcion,
            color,
            tipo,
            requiereCallback: requiereCallback === 'true' || requiereCallback === true,
            activa: activa === 'true' || activa === true,
            orden: parseInt(orden) || 0
        });

        req.session.mensajeExito = '✅ Disposición actualizada exitosamente';
        res.redirect('/disposiciones/lista');

    } catch (error) {
        console.error('Error al actualizar disposición:', error);
        req.session.swalError = error.message;
        res.redirect(`/disposiciones/editar/${req.params.id}`);
    }
}

/**
 * Eliminar disposición
 */
export async function eliminarDisposicion(req, res) {
    try {
        const { id } = req.params;
        await disposicionService.deleteDisposicion(id);

        req.session.mensajeExito = '✅ Disposición eliminada exitosamente';
        res.redirect('/disposiciones/lista');

    } catch (error) {
        console.error('Error al eliminar disposición:', error);
        req.session.swalError = error.message;
        res.redirect('/disposiciones/lista');
    }
}

/**
 * Alternar estado activo/inactivo
 */
export async function toggleEstado(req, res) {
    try {
        const { id } = req.params;
        const disposicion = await disposicionService.toggleDisposicionStatus(id);

        const mensaje = disposicion.activa
            ? '✅ Disposición activada'
            : '⚠️ Disposición desactivada';

        req.session.mensajeExito = mensaje;
        res.redirect('/disposiciones/lista');

    } catch (error) {
        console.error('Error al cambiar estado:', error);
        req.session.swalError = error.message;
        res.redirect('/disposiciones/lista');
    }
}

/**
 * API: Obtener disposiciones activas (para AJAX)
 */
export async function obtenerDisposicionesActivas(req, res) {
    try {
        const disposiciones = await disposicionService.getActiveDisposiciones();
        res.json({ success: true, disposiciones });

    } catch (error) {
        console.error('Error al obtener disposiciones activas:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * API: Obtener disposiciones por campaña (para AJAX)
 */
export async function obtenerDisposicionesPorCampana(req, res) {
    try {
        const { campanaId } = req.params;
        const disposiciones = await disposicionService.getDisposicionesByCampana(campanaId);

        res.json({ success: true, disposiciones });

    } catch (error) {
        console.error('Error al obtener disposiciones de campaña:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

/**
 * API: Obtener estadísticas de disposiciones (para reportes)
 */
export async function obtenerEstadisticas(req, res) {
    try {
        const { campanaId } = req.query;
        const stats = await disposicionService.getDisposicionStats(campanaId || null);

        res.json({ success: true, stats });

    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}
