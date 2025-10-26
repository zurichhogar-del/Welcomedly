/**
 * Script para ejecutar migración de índices - Sprint 2.3.3
 * Run: node src/database/migrations/execute_indexes.js
 */

import sequelize from '../connection.js';
import migration from './20251024_add_performance_indexes.js';

async function runIndexMigration() {
    try {
        console.log('🚀 Ejecutando migración de índices de rendimiento...\n');

        // Ejecutar migración
        await migration.up(sequelize.getQueryInterface());

        console.log('\n✅ Migración de índices completada exitosamente');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Error ejecutando migración de índices:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

runIndexMigration();
