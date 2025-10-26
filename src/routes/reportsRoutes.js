import { Router } from "express";
import {
    reportesAgentes,
    reportesCampanas
} from "../controllers/reportController.js";
import { asegurarAutenticacion } from "../middlewares/authMiddleware.js";
// Sprint 2.4.2: Throttling para reportes (queries costosas)
import { reportLimiter } from "../middlewares/advancedRateLimiting.js";

const router = Router();

// Sprint 2.4.2: reportLimiter - 10 req/min (AGENTE), 30 req/min (ADMIN)
router.get("/reportes-agentes", reportLimiter, asegurarAutenticacion, reportesAgentes);
router.get("/reportes-campanas", reportLimiter, asegurarAutenticacion, reportesCampanas);

export default router;