/**
 * Rutas de Disposiciones
 * Gestión de códigos de disposición de llamadas
 */

import express from 'express';
import {
    mostrarDisposiciones,
    mostrarFormularioCrear,
    crearDisposicion,
    mostrarFormularioEditar,
    actualizarDisposicion,
    eliminarDisposicion,
    toggleEstado,
    obtenerDisposicionesActivas,
    obtenerDisposicionesPorCampana,
    obtenerEstadisticas
} from '../controllers/disposicionController.js';
import { asegurarAutenticacion } from '../middlewares/authMiddleware.js';
import { createResourceLimiter } from '../middlewares/securityMiddleware.js';
import { validate, validateParams, disposicionSchema, idParamSchema } from '../validators/schemas.js';

const router = express.Router();

// Proteger todas las rutas con autenticación
router.use(asegurarAutenticacion);

// ========== VISTAS (HTML) ==========

/**
 * GET /disposiciones/lista
 * Mostrar lista de disposiciones
 */
router.get('/lista', mostrarDisposiciones);

/**
 * GET /disposiciones/crear
 * Formulario de creación
 */
router.get('/crear', mostrarFormularioCrear);

/**
 * POST /disposiciones/crear
 * Crear nueva disposición
 */
router.post('/crear', createResourceLimiter, validate(disposicionSchema), crearDisposicion);

/**
 * GET /disposiciones/editar/:id
 * Formulario de edición
 */
router.get('/editar/:id', validateParams(idParamSchema), mostrarFormularioEditar);

/**
 * POST /disposiciones/editar/:id
 * Actualizar disposición
 */
router.post('/editar/:id', validateParams(idParamSchema), validate(disposicionSchema), actualizarDisposicion);

/**
 * POST /disposiciones/eliminar/:id
 * Eliminar disposición
 */
router.post('/eliminar/:id', validateParams(idParamSchema), eliminarDisposicion);

/**
 * POST /disposiciones/toggle/:id
 * Cambiar estado activo/inactivo
 */
router.post('/toggle/:id', validateParams(idParamSchema), toggleEstado);

// ========== API (JSON) ==========

/**
 * GET /disposiciones/api/activas
 * Obtener disposiciones activas (AJAX)
 */
router.get('/api/activas', obtenerDisposicionesActivas);

/**
 * GET /disposiciones/api/campana/:campanaId
 * Obtener disposiciones de una campaña específica (AJAX)
 */
router.get('/api/campana/:campanaId', obtenerDisposicionesPorCampana);

/**
 * GET /disposiciones/api/stats
 * Obtener estadísticas de uso de disposiciones (AJAX)
 * Query params: ?campanaId=123 (opcional)
 */
router.get('/api/stats', obtenerEstadisticas);

export default router;
