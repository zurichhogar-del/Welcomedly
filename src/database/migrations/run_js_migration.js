/**
 * Runner for JavaScript migration files
 * Usage: node src/database/migrations/run_js_migration.js 20251025_create_telephony_tables.js
 */

import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from '../connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    try {
        // Get migration file name from command line argument
        const migrationFile = process.argv[2];

        if (!migrationFile) {
            console.error('❌ Error: Debe especificar un archivo de migración');
            console.log('Uso: node run_js_migration.js <archivo_migracion.js>');
            process.exit(1);
        }

        console.log(`📞 Ejecutando migración: ${migrationFile}`);

        // Import migration module
        const migrationPath = path.join(__dirname, migrationFile);
        const migration = await import(`file://${migrationPath}`);

        // Run migration UP
        await migration.default.up(sequelize.getQueryInterface());

        console.log('✅ Migración completada exitosamente');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error ejecutando migración:', error);
        process.exit(1);
    }
}

// Run migration
runMigration();
