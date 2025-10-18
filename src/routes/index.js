import { Router } from "express";

import authRoutes from './authRoutes.js'
import campaignsRoutes from './campaignsRoutes.js'
import marketRoutes from './marketRoutes.js'
import chatRoutes from './chatRoutes.js'
import reportsRoutes from './reportsRoutes.js'
import agentsRoutes from './agentsRoutes.js'
import disposicionesRoutes from './disposicionesRoutes.js'
import { csrfProtection } from '../middlewares/csrfMiddleware.js' 

const router = Router();

// Ruta raíz - redirigir al login
router.get("/", (req, res) => {
    if (req.session && req.session.usuario) {
        return res.redirect('/market/market');
    }
    return res.redirect('/auth/login');
});

// Aplicar protección CSRF a todas las rutas excepto autenticación
router.use("/chat", chatRoutes)
router.use(csrfProtection); // Middleware CSRF para las siguientes rutas
router.use("/market", marketRoutes)
router.use("/campaign", campaignsRoutes)
router.use("/reports", reportsRoutes)
router.use("/agents", agentsRoutes)
router.use("/disposiciones", disposicionesRoutes)
// Las rutas de auth no llevan CSRF protection para permitir login/registro

export default router;