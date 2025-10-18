import { Router } from "express";

import authRoutes from './authRoutes.js'
import campaignsRoutes from './campaignsRoutes.js'
import marketRoutes from './marketRoutes.js'
import chatRoutes from './chatRoutes.js'
import reportsRoutes from './reportsRoutes.js'
import agentsRoutes from './agentsRoutes.js'
import disposicionesRoutes from './disposicionesRoutes.js' 

const router = Router();

// Ruta raíz - redirigir al login
router.get("/", (req, res) => {
    if (req.session && req.session.usuario) {
        return res.redirect('/market/market');
    }
    return res.redirect('/auth/login');
});

router.use("/auth", authRoutes)
router.use("/chat", chatRoutes)
router.use("/market", marketRoutes)
router.use("/campaign", campaignsRoutes)
router.use("/reports", reportsRoutes)
router.use("/agents", agentsRoutes)
router.use("/disposiciones", disposicionesRoutes)

export default router;