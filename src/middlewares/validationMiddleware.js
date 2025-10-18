import { body, validationResult } from 'express-validator';

// Middleware para manejar los resultados de validación
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg).join(', ');
        req.session.swalError = errorMessages;
        return res.redirect('back');
    }
    next();
};

// Validaciones para login
export const validateLogin = [
    body('correo')
        .trim()
        .isEmail().withMessage('El correo electrónico no es válido')
        .normalizeEmail(),
    body('contrasena')
        .notEmpty().withMessage('La contraseña es obligatoria')
        .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    handleValidationErrors
];

// Validaciones para crear usuario/agente
export const validateCreateUser = [
    body('primer_nombre')
        .trim()
        .notEmpty().withMessage('El primer nombre es obligatorio')
        .isLength({ min: 2, max: 50 }).withMessage('El primer nombre debe tener entre 2 y 50 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El primer nombre solo puede contener letras'),
    body('segundo_nombre')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('El segundo nombre debe tener máximo 50 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/).withMessage('El segundo nombre solo puede contener letras'),
    body('primer_apellido')
        .trim()
        .notEmpty().withMessage('El primer apellido es obligatorio')
        .isLength({ min: 2, max: 50 }).withMessage('El primer apellido debe tener entre 2 y 50 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El primer apellido solo puede contener letras'),
    body('segundo_apellido')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('El segundo apellido debe tener máximo 50 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]*$/).withMessage('El segundo apellido solo puede contener letras'),
    body('identificacion')
        .trim()
        .notEmpty().withMessage('La identificación es obligatoria')
        .isLength({ min: 5, max: 20 }).withMessage('La identificación debe tener entre 5 y 20 caracteres')
        .matches(/^[0-9]+$/).withMessage('La identificación solo puede contener números'),
    body('correo')
        .trim()
        .notEmpty().withMessage('El correo electrónico es obligatorio')
        .isEmail().withMessage('El correo electrónico no es válido')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('La contraseña es obligatoria')
        .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
    body('rol')
        .notEmpty().withMessage('El rol es obligatorio')
        .isIn(['ADMIN', 'AGENTE']).withMessage('El rol debe ser ADMIN o AGENTE'),
    handleValidationErrors
];

// Validaciones para crear formulario
export const validateCreateFormulario = [
    body('nombre')
        .trim()
        .notEmpty().withMessage('El nombre del formulario es obligatorio')
        .isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres'),
    body('campos')
        .isArray({ min: 1 }).withMessage('Debe agregar al menos una opción de tipificación'),
    body('campos.*')
        .trim()
        .notEmpty().withMessage('Las opciones de tipificación no pueden estar vacías')
        .isLength({ min: 2, max: 100 }).withMessage('Cada opción debe tener entre 2 y 100 caracteres'),
    handleValidationErrors
];

// Validaciones para crear campaña
export const validateCreateCampana = [
    body('nombre')
        .trim()
        .notEmpty().withMessage('El nombre de la campaña es obligatorio')
        .isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres'),
    body('formularioVenta')
        .notEmpty().withMessage('Debe seleccionar un formulario de tipificación')
        .isInt().withMessage('El formulario seleccionado no es válido'),
    body('agentes')
        .isArray({ min: 1 }).withMessage('Debe seleccionar al menos un agente'),
    handleValidationErrors
];

// Validaciones para agregar registro manual
export const validateAddRegistro = [
    body('nombre')
        .trim()
        .notEmpty().withMessage('El nombre es obligatorio')
        .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('telefono')
        .trim()
        .notEmpty().withMessage('El teléfono es obligatorio')
        .matches(/^[0-9\s\-\+\(\)]+$/).withMessage('El teléfono solo puede contener números y caracteres válidos')
        .isLength({ min: 7, max: 20 }).withMessage('El teléfono debe tener entre 7 y 20 caracteres'),
    body('correo')
        .trim()
        .notEmpty().withMessage('El correo electrónico es obligatorio')
        .isEmail().withMessage('El correo electrónico no es válido')
        .normalizeEmail(),
    handleValidationErrors
];

// Validación para tipificación
export const validateTipificacion = [
    body('tipificacion')
        .trim()
        .notEmpty().withMessage('Debe seleccionar una tipificación'),
    handleValidationErrors
];
