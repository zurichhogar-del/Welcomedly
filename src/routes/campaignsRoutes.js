import { Router } from "express";
import {
    mostrarFormularioRegistro,
    agregarRegistroManual,
    agregarRegistrosEnBloque,
    verCampanas,
    modificarCampana,
    volverALlamar,
    eliminarCampana,
    mostrarBaseDatosCampana,
    mostrarFormularioGestion,
    guardarGestion
} from "../controllers/campaignController.js";
import { asegurarAutenticacion } from "../middlewares/authMiddleware.js";
import multer from 'multer';

const router = Router();
const upload = multer();

// Middleware para layout y autenticación aplicado a TODAS las rutas
router.use(asegurarAutenticacion, (req, res, next) => {
    res.locals.layout = 'layouts/generalLayout'; // Establecer layout
    next();
});

// Configuración de rutas
router.get("/agregar-registros-enbloque", agregarRegistrosEnBloque);
router.get("/campanas", verCampanas);
router.get("/modificar-campana", modificarCampana);
router.get("/volver-a-llamar", volverALlamar);
router.get('/campanas/:id/agregar-registro', mostrarFormularioRegistro);


// Rutas con parámetros
router.get('/campanas/:id/eliminar', eliminarCampana);
router.get('/campanas/:id/ver-base', mostrarBaseDatosCampana);

router.get('/campanas/:campanaId/gestionar/:registroId', mostrarFormularioGestion);
router.post('/campanas/:campanaId/gestionar/:registroId', guardarGestion);
router.post('/campanas/:id/agregar-registro', agregarRegistroManual);
// Rutas POST

export default router;
