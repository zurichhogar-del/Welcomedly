import { Router } from "express";
import {
    reportesAgentes,
    reportesCampanas
} from "../controllers/reportController.js";
import { asegurarAutenticacion } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/reportes-agentes", asegurarAutenticacion, reportesAgentes);
router.get("/reportes-campanas", asegurarAutenticacion, reportesCampanas);

export default router;