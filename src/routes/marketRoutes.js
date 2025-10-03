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
router.post("/crear-formulario", guardarFormulario);
router.get('/formularios/editar/:id', mostrarEditarFormulario);
router.post('/formularios/editar/:id', actualizarFormulario);
router.get('/formularios/eliminar/:id', eliminarFormulario);
router.get('/crear-campana', mostrarFormularioCampana);
router.post('/crear-campana', upload.single('baseDatos'), crearCampana);


export default router;