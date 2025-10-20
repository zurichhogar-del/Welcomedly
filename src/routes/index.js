import { Router } from "express";

import authRoutes from './authRoutes.js'
import campaignsRoutes from './campaignsRoutes.js'
import marketRoutes from './marketRoutes.js'
import chatRoutes from './chatRoutes.js'
import reportsRoutes from './reportsRoutes.js'
import agentsRoutes from './agentsRoutes.js'
import disposicionesRoutes from './disposicionesRoutes.js'
import aiRoutes from './aiRoutes.js'
import { csrfProtection } from '../middlewares/csrfMiddleware.js' 

const router = Router();

// Ruta raíz - landing page
router.get("/", (req, res) => {
    try {
        console.log('Accediendo a ruta raíz');
        if (req.session && req.session.usuario) {
            console.log('Usuario autenticado, redirigiendo a market');
            return res.redirect('/market/market');
        }
        console.log('Renderizando landing page');
        res.render('landing', {
            layout: false,
            title: 'Welcomedly - Plataforma de Gestión de Call Center'
        });
    } catch (error) {
        console.error('Error en ruta raíz:', error);
        res.status(500).send('Error interno del servidor: ' + error.message);
    }
});

// Aplicar protección CSRF a todas las rutas excepto autenticación
router.use("/chat", chatRoutes)
router.use(csrfProtection); // Middleware CSRF para las siguientes rutas
router.use("/market", marketRoutes)
router.use("/campaign", campaignsRoutes)
router.use("/reports", reportsRoutes)
router.use("/agents", agentsRoutes)
router.use("/disposiciones", disposicionesRoutes)
router.use("/ai", aiRoutes)
// Las rutas de auth no llevan CSRF protection para permitir login/registro

export default router;