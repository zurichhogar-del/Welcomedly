/**
 * Joi Validation Schemas
 * Centralized input validation for all controllers
 */

import Joi from 'joi';

// ==================== AUTH SCHEMAS ====================

export const loginSchema = Joi.object({
    correo: Joi.string()
        .email({ tlds: { allow: false } })
        .required()
        .messages({
            'string.email': 'El correo electrónico no es válido',
            'any.required': 'El correo electrónico es requerido'
        }),
    contrasena: Joi.string()
        .min(6)
        .required()
        .messages({
            'string.min': 'La contraseña debe tener al menos 6 caracteres',
            'any.required': 'La contraseña es requerida'
        })
});

export const registroSchema = Joi.object({
    primerNombre: Joi.string().min(2).max(50).required().messages({
        'string.min': 'El primer nombre debe tener al menos 2 caracteres',
        'any.required': 'El primer nombre es requerido'
    }),
    segundoNombre: Joi.string().min(2).max(50).optional().allow(''),
    primerApellido: Joi.string().min(2).max(50).required().messages({
        'string.min': 'El primer apellido debe tener al menos 2 caracteres',
        'any.required': 'El primer apellido es requerido'
    }),
    segundoApellido: Joi.string().min(2).max(50).optional().allow(''),
    identificacion: Joi.string().min(5).max(20).required().messages({
        'string.min': 'La identificación debe tener al menos 5 caracteres',
        'any.required': 'La identificación es requerida'
    }),
    correo: Joi.string()
        .email({ tlds: { allow: false } })
        .required()
        .messages({
            'string.email': 'El correo electrónico no es válido',
            'any.required': 'El correo electrónico es requerido'
        }),
    username: Joi.string().min(3).max(30).optional(),
    rol: Joi.string().valid('ADMIN', 'AGENTE').required().messages({
        'any.only': 'El rol debe ser ADMIN o AGENTE',
        'any.required': 'El rol es requerido'
    }),
    contrasena: Joi.string().min(8).required().messages({
        'string.min': 'La contraseña debe tener al menos 8 caracteres',
        'any.required': 'La contraseña es requerida'
    })
});

// ==================== CAMPAIGN SCHEMAS ====================

export const campanaSchema = Joi.object({
    nombre: Joi.string().min(3).max(100).required().messages({
        'string.min': 'El nombre debe tener al menos 3 caracteres',
        'any.required': 'El nombre de la campaña es requerido'
    }),
    descripcion: Joi.string().max(500).optional().allow(''),
    formularioId: Joi.number().integer().positive().required().messages({
        'number.base': 'El ID del formulario debe ser un número',
        'any.required': 'El formulario es requerido'
    }),
    agentesIds: Joi.array().items(Joi.number().integer().positive()).optional(),
    disposicionesIds: Joi.array().items(Joi.number().integer().positive()).optional(),
    activa: Joi.boolean().optional().default(true)
});

export const baseCampanaSchema = Joi.object({
    campanaId: Joi.number().integer().positive().required(),
    nombre: Joi.string().min(2).max(100).required(),
    telefono: Joi.string().pattern(/^[0-9+\-\s()]+$/).min(7).max(20).required().messages({
        'string.pattern.base': 'El teléfono debe contener solo números y símbolos válidos'
    }),
    email: Joi.string().email({ tlds: { allow: false } }).optional().allow(''),
    direccion: Joi.string().max(200).optional().allow(''),
    otrosCampos: Joi.object().optional(),
    disposicionId: Joi.number().integer().positive().optional().allow(null),
    callbackDate: Joi.date().optional().allow(null),
    callbackNotas: Joi.string().max(500).optional().allow(''),
    intentosLlamada: Joi.number().integer().min(0).optional().default(0)
});

// ==================== FORMULARIO SCHEMAS ====================

export const formularioSchema = Joi.object({
    nombre: Joi.string().min(3).max(100).required().messages({
        'string.min': 'El nombre debe tener al menos 3 caracteres',
        'any.required': 'El nombre del formulario es requerido'
    }),
    descripcion: Joi.string().max(500).optional().allow(''),
    campos: Joi.array().items(
        Joi.object({
            nombre: Joi.string().required(),
            tipo: Joi.string().valid('text', 'number', 'email', 'tel', 'textarea', 'select', 'checkbox', 'radio', 'date').required(),
            requerido: Joi.boolean().optional().default(false),
            opciones: Joi.array().items(Joi.string()).optional(),
            placeholder: Joi.string().optional()
        })
    ).min(1).required().messages({
        'array.min': 'Debe incluir al menos un campo en el formulario'
    })
});

// ==================== DISPOSITION SCHEMAS ====================

export const disposicionSchema = Joi.object({
    nombre: Joi.string().min(2).max(100).required().messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'any.required': 'El nombre es requerido'
    }),
    codigo: Joi.string().min(2).max(20).uppercase().required().messages({
        'string.uppercase': 'El código debe estar en mayúsculas',
        'any.required': 'El código es requerido'
    }),
    descripcion: Joi.string().max(500).optional().allow(''),
    tipo: Joi.string().valid('EXITOSA', 'NO_CONTACTO', 'SEGUIMIENTO', 'NO_EXITOSA').required().messages({
        'any.only': 'El tipo debe ser EXITOSA, NO_CONTACTO, SEGUIMIENTO o NO_EXITOSA'
    }),
    requiereCallback: Joi.boolean().optional().default(false),
    activa: Joi.boolean().optional().default(true),
    color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional().messages({
        'string.pattern.base': 'El color debe ser un código hexadecimal válido (ej: #FF5733)'
    })
});

export const saveDisposicionSchema = Joi.object({
    disposicionId: Joi.number().integer().positive().required().messages({
        'any.required': 'La disposición es requerida'
    }),
    callbackDate: Joi.date().greater('now').optional().allow(null).messages({
        'date.greater': 'La fecha del callback debe ser futura'
    }),
    callbackNotas: Joi.string().max(500).optional().allow('')
});

// ==================== HELPER: Validation Middleware ====================

/**
 * Middleware factory para validar request body con esquema Joi
 * @param {Joi.Schema} schema - Esquema Joi a validar
 * @returns {Function} Express middleware
 */
export const validate = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false, // Retornar todos los errores
            stripUnknown: true // Remover campos desconocidos
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            // Formato para API JSON
            if (req.accepts('json')) {
                return res.status(400).json({
                    success: false,
                    message: 'Error de validación',
                    errors
                });
            }

            // Formato para vistas HTML
            req.session.swalError = errors.map(e => e.message).join(', ');
            return res.redirect('back');
        }

        // Reemplazar req.body con valores validados y sanitizados
        req.body = value;
        next();
    };
};

/**
 * Middleware para validar parámetros de ruta (req.params)
 * @param {Joi.Schema} schema - Esquema Joi a validar
 */
export const validateParams = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.params, {
            abortEarly: false
        });

        if (error) {
            const errors = error.details.map(detail => detail.message);

            if (req.accepts('json')) {
                return res.status(400).json({
                    success: false,
                    message: 'Parámetros inválidos',
                    errors
                });
            }

            req.session.swalError = errors.join(', ');
            return res.redirect('back');
        }

        req.params = value;
        next();
    };
};

/**
 * Schema para validar IDs en params
 */
export const idParamSchema = Joi.object({
    id: Joi.number().integer().positive().required().messages({
        'number.base': 'El ID debe ser un número',
        'number.positive': 'El ID debe ser positivo'
    })
});
