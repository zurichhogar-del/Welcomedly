import { Router } from "express";

import authRoutes from './authRoutes.js' 
import campaignsRoutes from './campaignsRoutes.js' 
import marketRoutes from './marketRoutes.js' 
import chatRoutes from './chatRoutes.js'
import reportsRoutes from './reportsRoutes.js' 
import agentsRoutes from './agentsRoutes.js' 

const router = Router();

router.use("/auth", authRoutes)
router.use("/chat", chatRoutes)
router.use("/market", marketRoutes)
router.use("/campaign", campaignsRoutes)
router.use("/reports", reportsRoutes)
router.use("/agents", agentsRoutes )

export default router;