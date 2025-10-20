/**
 * Tests para validation schemas
 * Pruebas de esquemas de validación Joi
 */

import { describe, test, expect } from '@jest/globals';
import {
    loginSchema,
    formularioSchema,
    disposicionSchema,
    campanaSchema
} from '../../src/validators/schemas.js';

describe('Validation Schemas', () => {
    describe('loginSchema', () => {
        test('debería validar email y contraseña correctos', () => {
            const validData = {
                correo: 'test@test.com',
                contrasena: 'password123'
            };

            const { error, value } = loginSchema.validate(validData);
            expect(error).toBeUndefined();
            expect(value).toEqual(validData);
        });

        test('debería rechazar email inválido', () => {
            const invalidData = {
                correo: 'not-an-email',
                contrasena: 'password123'
            };

            const { error } = loginSchema.validate(invalidData);
            expect(error).toBeDefined();
            expect(error.details[0].path).toContain('correo');
        });

        test('debería rechazar contraseña corta', () => {
            const invalidData = {
                correo: 'test@test.com',
                contrasena: '123'
            };

            const { error } = loginSchema.validate(invalidData);
            expect(error).toBeDefined();
            expect(error.details[0].path).toContain('contrasena');
        });
    });

    describe('formularioSchema', () => {
        test('debería validar formulario con campos válidos', () => {
            const validData = {
                nombre: 'Formulario Test',
                descripcion: 'Descripción de prueba',
                campos: [
                    {
                        nombre: 'nombre',
                        tipo: 'text',
                        requerido: true
                    },
                    {
                        nombre: 'email',
                        tipo: 'email',
                        requerido: true
                    }
                ]
            };

            const { error, value } = formularioSchema.validate(validData);
            expect(error).toBeUndefined();
            expect(value.nombre).toBe('Formulario Test');
            expect(value.campos).toHaveLength(2);
        });

        test('debería rechazar formulario sin campos', () => {
            const invalidData = {
                nombre: 'Formulario Test',
                campos: []
            };

            const { error } = formularioSchema.validate(invalidData);
            expect(error).toBeDefined();
        });
    });

    describe('disposicionSchema', () => {
        test('debería validar disposición correcta', () => {
            const validData = {
                nombre: 'Venta Exitosa',
                codigo: 'VENTA_OK',
                descripcion: 'Cliente realizó compra',
                tipo: 'EXITOSA',
                requiereCallback: false,
                activa: true
            };

            const { error, value } = disposicionSchema.validate(validData);
            expect(error).toBeUndefined();
            expect(value.tipo).toBe('EXITOSA');
        });

        test('debería rechazar tipo inválido', () => {
            const invalidData = {
                nombre: 'Test',
                codigo: 'TEST',
                tipo: 'TIPO_INVALIDO'
            };

            const { error } = disposicionSchema.validate(invalidData);
            expect(error).toBeDefined();
        });

        test('debería convertir código a mayúsculas', () => {
            const data = {
                nombre: 'Test',
                codigo: 'test_code',
                tipo: 'EXITOSA'
            };

            const { value } = disposicionSchema.validate(data);
            expect(value.codigo).toBe('TEST_CODE');
        });
    });

    describe('campanaSchema', () => {
        test('debería validar campaña correcta', () => {
            const validData = {
                nombre: 'Campaña Test',
                descripcion: 'Descripción de prueba',
                formularioId: 1,
                activa: true
            };

            const { error, value } = campanaSchema.validate(validData);
            expect(error).toBeUndefined();
            expect(value.nombre).toBe('Campaña Test');
            expect(value.formularioId).toBe(1);
        });

        test('debería rechazar formularioId negativo', () => {
            const invalidData = {
                nombre: 'Campaña Test',
                formularioId: -1
            };

            const { error } = disposicionSchema.validate(invalidData);
            expect(error).toBeDefined();
        });
    });
});
