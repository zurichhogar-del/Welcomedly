/**
 * Trunk Routes - Sprint 3.1.6
 * Rutas para la gestión de troncales SIP
 */

import express from 'express';
import trunkController from '../controllers/trunkController.js';
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware.js';
import { createResourceLimiter } from '../middlewares/rateLimitMiddleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(requireAuth);

// ==================== VISTAS ====================

// GET /trunks - Listar trunks
router.get('/', requireAdmin, trunkController.listTrunks);

// GET /trunks/nuevo - Formulario de creación
router.get('/nuevo', requireAdmin, trunkController.newTrunk);

// POST /trunks - Crear trunk
router.post('/', requireAdmin, createResourceLimiter, trunkController.createTrunk);

// GET /trunks/:id - Ver detalles
router.get('/:id', requireAdmin, trunkController.viewTrunk);

// GET /trunks/:id/editar - Formulario de edición
router.get('/:id/editar', requireAdmin, trunkController.editTrunk);

// POST /trunks/:id - Actualizar trunk
router.post('/:id', requireAdmin, trunkController.updateTrunk);

// POST /trunks/:id/eliminar - Eliminar trunk
router.post('/:id/eliminar', requireAdmin, trunkController.deleteTrunk);

// POST /trunks/:id/test - Probar conexión
router.post('/:id/test', requireAdmin, trunkController.testTrunk);

// ==================== ASIGNACIÓN A CAMPAÑAS ====================

// POST /trunks/:trunkId/assign/:campanaId - Asignar a campaña
router.post('/:trunkId/assign/:campanaId', requireAdmin, trunkController.assignToCampaign);

// POST /trunks/:trunkId/remove/:campanaId - Remover de campaña
router.post('/:trunkId/remove/:campanaId', requireAdmin, trunkController.removeFromCampaign);

// ==================== API ENDPOINTS ====================

// GET /api/trunks - Listar todos
router.get('/api/list', trunkController.apiListTrunks);

// GET /api/trunks/active - Listar activos
router.get('/api/active', trunkController.apiListActiveTrunks);

// GET /api/trunks/:id/stats - Estadísticas
router.get('/api/:id/stats', trunkController.apiGetTrunkStats);

export default router;
