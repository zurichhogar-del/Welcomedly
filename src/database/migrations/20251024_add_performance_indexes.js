/**
 * Migration: Add Performance Indexes - Sprint 2.3.3
 * Adds composite indexes to improve query performance
 *
 * Run with: node src/database/migrations/run_migration.js
 */

import { QueryInterface, DataTypes } from 'sequelize';

export default {
    /**
     * Add performance indexes
     */
    up: async (queryInterface) => {
        console.log('📊 Añadiendo índices de rendimiento...');

        // 1. Índice para búsqueda de usuarios por rol y estado (query común en agentController)
        try {
            await queryInterface.addIndex('usuarios', ['rol', 'estado'], {
                name: 'idx_usuarios_rol_estado',
                where: {
                    estado: true // Partial index solo para usuarios activos
                }
            });
            console.log('✅ Índice idx_usuarios_rol_estado creado');
        } catch (error) {
            if (!error.message.includes('already exists')) throw error;
            console.log('⚠️  Índice idx_usuarios_rol_estado ya existe');
        }

        // 2. Índice para búsqueda por username (autenticación)
        try {
            await queryInterface.addIndex('usuarios', ['username'], {
                name: 'idx_usuarios_username',
                unique: false // No unique para permitir históricos
            });
            console.log('✅ Índice idx_usuarios_username creado');
        } catch (error) {
            if (!error.message.includes('already exists')) throw error;
            console.log('⚠️  Índice idx_usuarios_username ya existe');
        }

        // 3. Índice compuesto para disposiciones por campaña (reportes frecuentes)
        try {
            await queryInterface.sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_base_campanas_campana_disposicion
                ON base_campanas (campana_id, disposicion_id)
                WHERE disposicion_id IS NOT NULL;
            `);
            console.log('✅ Índice idx_base_campanas_campana_disposicion creado');
        } catch (error) {
            if (!error.message.includes('already exists')) throw error;
            console.log('⚠️  Índice idx_base_campanas_campana_disposicion ya existe');
        }

        // 4. Índice para última llamada (tracking de actividad)
        try {
            await queryInterface.sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_base_campanas_ultima_llamada
                ON base_campanas (ultima_llamada)
                WHERE ultima_llamada IS NOT NULL;
            `);
            console.log('✅ Índice idx_base_campanas_ultima_llamada creado');
        } catch (error) {
            if (!error.message.includes('already exists')) throw error;
            console.log('⚠️  Índice idx_base_campanas_ultima_llamada ya existe');
        }

        // 5. Índice GIN para búsqueda en JSONB otros_campos
        try {
            await queryInterface.sequelize.query(`
                CREATE INDEX IF NOT EXISTS idx_base_campanas_otros_campos_gin
                ON base_campanas USING GIN (otros_campos);
            `);
            console.log('✅ Índice GIN idx_base_campanas_otros_campos_gin creado');
        } catch (error) {
            if (!error.message.includes('already exists')) throw error;
            console.log('⚠️  Índice GIN idx_base_campanas_otros_campos_gin ya existe');
        }

        // 6. Índice para disposiciones activas (UI dropdowns)
        try {
            await queryInterface.addIndex('disposiciones', ['activa', 'orden'], {
                name: 'idx_disposiciones_activa_orden',
                where: {
                    activa: true
                }
            });
            console.log('✅ Índice idx_disposiciones_activa_orden creado');
        } catch (error) {
            if (!error.message.includes('already exists')) throw error;
            console.log('⚠️  Índice idx_disposiciones_activa_orden ya existe');
        }

        // 7. Índice para tipo de disposición (filtros frecuentes)
        try {
            await queryInterface.addIndex('disposiciones', ['tipo', 'activa'], {
                name: 'idx_disposiciones_tipo_activa'
            });
            console.log('✅ Índice idx_disposiciones_tipo_activa creado');
        } catch (error) {
            if (!error.message.includes('already exists')) throw error;
            console.log('⚠️  Índice idx_disposiciones_tipo_activa ya existe');
        }

        console.log('✅ Todos los índices de rendimiento han sido creados o ya existían');
        return Promise.resolve();
    },

    /**
     * Remove performance indexes (rollback)
     */
    down: async (queryInterface) => {
        console.log('🗑️  Eliminando índices de rendimiento...');

        const indexes = [
            { table: 'usuarios', name: 'idx_usuarios_rol_estado' },
            { table: 'usuarios', name: 'idx_usuarios_username' },
            { table: 'base_campanas', name: 'idx_base_campanas_campana_disposicion' },
            { table: 'base_campanas', name: 'idx_base_campanas_ultima_llamada' },
            { table: 'base_campanas', name: 'idx_base_campanas_otros_campos_gin' },
            { table: 'disposiciones', name: 'idx_disposiciones_activa_orden' },
            { table: 'disposiciones', name: 'idx_disposiciones_tipo_activa' }
        ];

        for (const { table, name } of indexes) {
            try {
                await queryInterface.removeIndex(table, name);
                console.log(`✅ Índice ${name} eliminado`);
            } catch (error) {
                console.log(`⚠️  Error eliminando índice ${name}:`, error.message);
            }
        }

        console.log('✅ Rollback de índices completado');
        return Promise.resolve();
    }
};
