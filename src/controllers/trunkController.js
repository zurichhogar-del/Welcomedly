/**
 * Trunk Controller - Sprint 3.1.6
 * Controlador para la gestión de troncales SIP
 */

import trunkService from '../services/trunkService.js';
import logger from '../utils/logger.js';

class TrunkController {
    /**
     * GET /trunks - Listar todos los trunks
     */
    async listTrunks(req, res) {
        try {
            const trunks = await trunkService.getAllTrunks();

            res.render('telephonyViews/trunks/list', {
                layout: 'layouts/generalLayout',
                title: 'Gestión de Troncales SIP',
                trunks,
                usuario: req.session.usuario
            });
        } catch (error) {
            logger.error('Error listando trunks', { error: error.message });
            req.session.swalError = 'Error al cargar la lista de troncales';
            res.redirect('/dashboard');
        }
    }

    /**
     * GET /trunks/nuevo - Formulario de creación
     */
    async newTrunk(req, res) {
        try {
            res.render('telephonyViews/trunks/form', {
                layout: 'layouts/generalLayout',
                title: 'Nueva Troncal SIP',
                trunk: null,
                action: 'create',
                usuario: req.session.usuario
            });
        } catch (error) {
            logger.error('Error mostrando formulario de nuevo trunk', { error: error.message });
            req.session.swalError = 'Error al cargar el formulario';
            res.redirect('/trunks');
        }
    }

    /**
     * POST /trunks - Crear trunk
     */
    async createTrunk(req, res) {
        try {
            const trunkData = {
                name: req.body.name,
                description: req.body.description,
                provider: req.body.provider,
                trunkType: req.body.trunkType || 'pjsip',
                host: req.body.host,
                port: parseInt(req.body.port) || 5060,
                username: req.body.username,
                password: req.body.password,
                fromUser: req.body.fromUser,
                fromDomain: req.body.fromDomain,
                maxChannels: parseInt(req.body.maxChannels) || 10,
                priority: parseInt(req.body.priority) || 10,
                status: req.body.status || 'active'
            };

            const trunk = await trunkService.createTrunk(trunkData);

            logger.info('Trunk creado desde controlador', {
                trunkId: trunk.id,
                userId: req.session.usuario.id
            });

            req.session.mensajeExito = `✅ Troncal "${trunk.name}" creada exitosamente`;
            res.redirect('/trunks');
        } catch (error) {
            logger.error('Error creando trunk', { error: error.message });
            req.session.swalError = `Error al crear troncal: ${error.message}`;
            res.redirect('/trunks/nuevo');
        }
    }

    /**
     * GET /trunks/:id/editar - Formulario de edición
     */
    async editTrunk(req, res) {
        try {
            const trunk = await trunkService.getTrunkById(req.params.id);

            res.render('telephonyViews/trunks/form', {
                layout: 'layouts/generalLayout',
                title: 'Editar Troncal SIP',
                trunk,
                action: 'edit',
                usuario: req.session.usuario
            });
        } catch (error) {
            logger.error('Error mostrando formulario de edición', { error: error.message });
            req.session.swalError = 'Error al cargar la troncal';
            res.redirect('/trunks');
        }
    }

    /**
     * POST /trunks/:id - Actualizar trunk
     */
    async updateTrunk(req, res) {
        try {
            const trunkData = {
                name: req.body.name,
                description: req.body.description,
                host: req.body.host,
                port: parseInt(req.body.port),
                username: req.body.username,
                password: req.body.password,
                fromUser: req.body.fromUser,
                fromDomain: req.body.fromDomain,
                maxChannels: parseInt(req.body.maxChannels),
                priority: parseInt(req.body.priority),
                status: req.body.status
            };

            const trunk = await trunkService.updateTrunk(req.params.id, trunkData);

            logger.info('Trunk actualizado desde controlador', {
                trunkId: trunk.id,
                userId: req.session.usuario.id
            });

            req.session.mensajeExito = `✅ Troncal "${trunk.name}" actualizada exitosamente`;
            res.redirect('/trunks');
        } catch (error) {
            logger.error('Error actualizando trunk', { error: error.message });
            req.session.swalError = `Error al actualizar troncal: ${error.message}`;
            res.redirect(`/trunks/${req.params.id}/editar`);
        }
    }

    /**
     * POST /trunks/:id/eliminar - Eliminar trunk
     */
    async deleteTrunk(req, res) {
        try {
            await trunkService.deleteTrunk(req.params.id);

            logger.info('Trunk eliminado desde controlador', {
                trunkId: req.params.id,
                userId: req.session.usuario.id
            });

            req.session.mensajeExito = '✅ Troncal eliminada exitosamente';
            res.redirect('/trunks');
        } catch (error) {
            logger.error('Error eliminando trunk', { error: error.message });
            req.session.swalError = `Error al eliminar troncal: ${error.message}`;
            res.redirect('/trunks');
        }
    }

    /**
     * GET /trunks/:id - Ver detalles del trunk
     */
    async viewTrunk(req, res) {
        try {
            const trunk = await trunkService.getTrunkById(req.params.id);
            const stats = await trunkService.getTrunkStats(req.params.id);

            res.render('telephonyViews/trunks/view', {
                layout: 'layouts/generalLayout',
                title: `Troncal: ${trunk.name}`,
                trunk,
                stats,
                usuario: req.session.usuario
            });
        } catch (error) {
            logger.error('Error viendo detalles de trunk', { error: error.message });
            req.session.swalError = 'Error al cargar los detalles de la troncal';
            res.redirect('/trunks');
        }
    }

    /**
     * POST /trunks/:id/test - Probar conexión del trunk
     */
    async testTrunk(req, res) {
        try {
            const result = await trunkService.testTrunkConnection(req.params.id);

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            logger.error('Error probando trunk', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * POST /trunks/:trunkId/assign/:campanaId - Asignar trunk a campaña
     */
    async assignToCampaign(req, res) {
        try {
            const { trunkId, campanaId } = req.params;
            const priority = parseInt(req.body.priority) || 10;

            await trunkService.assignTrunkToCampaign(trunkId, campanaId, priority);

            logger.info('Trunk asignado a campaña desde controlador', {
                trunkId,
                campanaId,
                userId: req.session.usuario.id
            });

            res.json({
                success: true,
                message: 'Troncal asignada a campaña exitosamente'
            });
        } catch (error) {
            logger.error('Error asignando trunk a campaña', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * POST /trunks/:trunkId/remove/:campanaId - Remover trunk de campaña
     */
    async removeFromCampaign(req, res) {
        try {
            const { trunkId, campanaId } = req.params;

            await trunkService.removeTrunkFromCampaign(trunkId, campanaId);

            logger.info('Trunk removido de campaña desde controlador', {
                trunkId,
                campanaId,
                userId: req.session.usuario.id
            });

            res.json({
                success: true,
                message: 'Troncal removida de campaña exitosamente'
            });
        } catch (error) {
            logger.error('Error removiendo trunk de campaña', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * GET /api/trunks - API: Listar trunks
     */
    async apiListTrunks(req, res) {
        try {
            const trunks = await trunkService.getAllTrunks();

            res.json({
                success: true,
                data: trunks
            });
        } catch (error) {
            logger.error('Error en API listando trunks', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * GET /api/trunks/active - API: Listar trunks activos
     */
    async apiListActiveTrunks(req, res) {
        try {
            const trunks = await trunkService.getActiveTrunks();

            res.json({
                success: true,
                data: trunks
            });
        } catch (error) {
            logger.error('Error en API listando trunks activos', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * GET /api/trunks/:id/stats - API: Estadísticas del trunk
     */
    async apiGetTrunkStats(req, res) {
        try {
            const stats = await trunkService.getTrunkStats(req.params.id);

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            logger.error('Error obteniendo estadísticas de trunk', { error: error.message });
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

export default new TrunkController();
