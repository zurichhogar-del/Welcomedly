import { Router } from "express";
import {
    mostrarAgentes,
    mostrarCrearAgente,
    mostrarListaAgentes,
    mostrarMagicians,
    crearAgente,
    eliminarAgente,
    cambiarEstadoAgente
} from "../controllers/agentController.js";
import { asegurarAutenticacion } from "../middlewares/authMiddleware.js";


const router = Router();

router.get("/agentes", asegurarAutenticacion, mostrarAgentes);
router.get("/crear-agente", asegurarAutenticacion, mostrarCrearAgente);
router.post("/crear-agente", asegurarAutenticacion, crearAgente);
router.get('/lista-agentes', asegurarAutenticacion, mostrarListaAgentes);
router.get("/magicians", asegurarAutenticacion, mostrarMagicians);
router.get('/eliminar/:id', asegurarAutenticacion, eliminarAgente);
router.get('/cambiar-estado/:id', asegurarAutenticacion, cambiarEstadoAgente);

export default router;