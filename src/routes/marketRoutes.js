import { Router } from "express";
import {
    crearFormulario,
    formularios,
    vistaMarket,
    guardarFormulario,
    eliminarFormulario,
    mostrarEditarFormulario,
    actualizarFormulario,
    mostrarFormularioCampana,
    crearCampana
} from "../controllers/marketController.js";
import { asegurarAutenticacion } from "../middlewares/authMiddleware.js";
import { upload } from '../middlewares/multerMiddleware.js';
import { createResourceLimiter, uploadLimiter } from '../middlewares/securityMiddleware.js';
import { validate, validateParams, formularioSchema, campanaSchema, idParamSchema } from '../validators/schemas.js';

const router = Router();

// Middleware para layout general de market
const layoutMarket = (req, res, next) => {
    res.locals.layout = 'layouts/generalLayout';
    next();
};

// Aplicar a todas las rutas de market
router.use(asegurarAutenticacion, layoutMarket);

// Configuración de rutas
router.get("/market", vistaMarket);
router.get("/formularios", formularios);
router.get("/crear-formulario", crearFormulario);
router.post("/crear-formulario", createResourceLimiter, validate(formularioSchema), guardarFormulario);
router.get('/formularios/editar/:id', validateParams(idParamSchema), mostrarEditarFormulario);
router.post('/formularios/editar/:id', validateParams(idParamSchema), validate(formularioSchema), actualizarFormulario);
router.get('/formularios/eliminar/:id', validateParams(idParamSchema), eliminarFormulario);
router.get('/crear-campana', mostrarFormularioCampana);
router.post('/crear-campana', uploadLimiter, upload.single('baseDatos'), validate(campanaSchema), crearCampana);


export default router;