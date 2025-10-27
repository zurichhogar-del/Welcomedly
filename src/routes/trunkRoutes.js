/**
 * Trunk Routes - Sprint 3.1.6
 * Rutas para la gestión de troncales SIP
 */

import express from 'express';
import trunkController from '../controllers/trunkController.js';
import { asegurarAutenticacion, asegurarAdmin } from '../middlewares/authMiddleware.js';
import { createResourceLimiter } from '../middlewares/securityMiddleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(asegurarAutenticacion);

// ==================== VISTAS ====================

// GET /trunks - Listar trunks
router.get('/', asegurarAdmin, trunkController.listTrunks);

// GET /trunks/nuevo - Formulario de creación
router.get('/nuevo', asegurarAdmin, trunkController.newTrunk);

// POST /trunks - Crear trunk
router.post('/', asegurarAdmin, createResourceLimiter, trunkController.createTrunk);

// GET /trunks/:id - Ver detalles
router.get('/:id', asegurarAdmin, trunkController.viewTrunk);

// GET /trunks/:id/editar - Formulario de edición
router.get('/:id/editar', asegurarAdmin, trunkController.editTrunk);

// POST /trunks/:id - Actualizar trunk
router.post('/:id', asegurarAdmin, trunkController.updateTrunk);

// POST /trunks/:id/eliminar - Eliminar trunk
router.post('/:id/eliminar', asegurarAdmin, trunkController.deleteTrunk);

// POST /trunks/:id/test - Probar conexión
router.post('/:id/test', asegurarAdmin, trunkController.testTrunk);

// ==================== ASIGNACIÓN A CAMPAÑAS ====================

// POST /trunks/:trunkId/assign/:campanaId - Asignar a campaña
router.post('/:trunkId/assign/:campanaId', asegurarAdmin, trunkController.assignToCampaign);

// POST /trunks/:trunkId/remove/:campanaId - Remover de campaña
router.post('/:trunkId/remove/:campanaId', asegurarAdmin, trunkController.removeFromCampaign);

// ==================== API ENDPOINTS ====================

// GET /api/trunks - Listar todos
router.get('/api/list', trunkController.apiListTrunks);

// GET /api/trunks/active - Listar activos
router.get('/api/active', trunkController.apiListActiveTrunks);

// GET /api/trunks/:id/stats - Estadísticas
router.get('/api/:id/stats', trunkController.apiGetTrunkStats);

export default router;
