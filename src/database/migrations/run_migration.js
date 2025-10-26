/**
 * Script para ejecutar migraciones de base de datos
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from '../connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MigrationRunner {
    constructor() {
        this.migrationsPath = path.join(__dirname, 'migrations');
        this.migrationsTable = 'schema_migrations';
    }

    /**
     * Ejecutar todas las migraciones pendientes
     */
    async runMigrations() {
        try {
            console.log('🚀 Iniciando migración de base de datos...');

            // Crear tabla de migraciones si no existe
            await this.createMigrationsTable();

            // Obtener migraciones ya ejecutadas
            const executedMigrations = await this.getExecutedMigrations();

            // Obtener archivos de migración
            const migrationFiles = this.getMigrationFiles();

            // Filtrar solo migraciones no ejecutadas
            const pendingMigrations = migrationFiles.filter(file =>
                !executedMigrations.includes(file)
            );

            if (pendingMigrations.length === 0) {
                console.log('✅ No hay migraciones pendientes');
                return;
            }

            console.log(`📋 Ejecutando ${pendingMigrations.length} migraciones pendientes:`);

            // Ejecutar migraciones en orden
            for (const migrationFile of pendingMigrations) {
                await this.executeMigration(migrationFile);
            }

            console.log('✅ Migraciones completadas exitosamente');

        } catch (error) {
            console.error('❌ Error ejecutando migraciones:', error);
            throw error;
        }
    }

    /**
     * Crear tabla para tracking de migraciones
     */
    async createMigrationsTable() {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
                id SERIAL PRIMARY KEY,
                migration_name VARCHAR(255) NOT NULL UNIQUE,
                executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `;

        await sequelize.query(createTableQuery);
        console.log('📋 Tabla de migraciones verificada');
    }

    /**
     * Obtener lista de migraciones ya ejecutadas
     */
    async getExecutedMigrations() {
        const [results] = await sequelize.query(
            `SELECT migration_name FROM ${this.migrationsTable} ORDER BY executed_at`
        );

        return results.map(row => row.migration_name);
    }

    /**
     * Obtener lista de archivos de migración
     */
    getMigrationFiles() {
        if (!fs.existsSync(this.migrationsPath)) {
            console.warn('⚠️ Directorio de migraciones no encontrado');
            return [];
        }

        const files = fs.readdirSync(this.migrationsPath)
            .filter(file => file.endsWith('.sql'))
            .sort();

        console.log(`📁 Encontrados ${files.length} archivos de migración`);
        return files;
    }

    /**
     * Ejecutar una migración específica
     */
    async executeMigration(migrationFile) {
        try {
            console.log(`⬆️ Ejecutando: ${migrationFile}`);

            const filePath = path.join(this.migrationsPath, migrationFile);
            const migrationSQL = fs.readFileSync(filePath, 'utf8');

            // Ejecutar en transacción
            const t = await sequelize.transaction();

            try {
                // Ejecutar SQL de la migración
                await sequelize.query(migrationSQL);

                // Registrar migración como ejecutada
                await sequelize.query(
                    `INSERT INTO ${this.migrationsTable} (migration_name) VALUES (?)`,
                    { replacements: [migrationFile] }
                );

                await t.commit();
                console.log(`✅ Migración ${migrationFile} completada`);

            } catch (error) {
                await t.rollback();
                throw error;
            }

        } catch (error) {
            console.error(`❌ Error en migración ${migrationFile}:`, error);
            throw error;
        }
    }

    /**
     * Revertir última migración (opcional)
     */
    async rollbackLastMigration() {
        try {
            console.log('🔄 Revertiendo última migración...');

            const [results] = await sequelize.query(
                `SELECT migration_name FROM ${this.migrationsTable} ORDER BY executed_at DESC LIMIT 1`
            );

            if (results.length === 0) {
                console.log('⚠️ No hay migraciones para revertir');
                return;
            }

            const lastMigration = results[0].migration_name;
            console.log(`⬆️ Revertiendo: ${lastMigration}`);

            // Aquí se podría implementar lógica de rollback
            // Por ahora, solo eliminamos el registro de la migración
            await sequelize.query(
                `DELETE FROM ${this.migrationsTable} WHERE migration_name = ?`,
                { replacements: [lastMigration] }
            );

            console.log('✅ Rollback completado');

        } catch (error) {
            console.error('❌ Error en rollback:', error);
            throw error;
        }
    }

    /**
     * Verificar estado de migraciones
     */
    async getStatus() {
        try {
            const [executedMigrations] = await sequelize.query(
                `SELECT migration_name, executed_at FROM ${this.migrationsTable} ORDER BY executed_at`
            );

            const allMigrations = this.getMigrationFiles();
            const executedNames = executedMigrations.map(m => m.migration_name);
            const pendingMigrations = allMigrations.filter(m => !executedNames.includes(m));

            console.log('\n📊 Estado de Migraciones:');
            console.log(`Total archivos: ${allMigrations.length}`);
            console.log(`Ejecutadas: ${executedMigrations.length}`);
            console.log(`Pendientes: ${pendingMigrations.length}`);

            if (executedMigrations.length > 0) {
                console.log('\n✅ Migraciones ejecutadas:');
                executedMigrations.forEach(m => {
                    console.log(`  - ${m.migration_name} (${m.executed_at})`);
                });
            }

            if (pendingMigrations.length > 0) {
                console.log('\n⏳ Migraciones pendientes:');
                pendingMigrations.forEach(m => {
                    console.log(`  - ${m}`);
                });
            }

            return {
                total: allMigrations.length,
                executed: executedMigrations.length,
                pending: pendingMigrations.length,
                executedList: executedMigrations,
                pendingList: pendingMigrations
            };

        } catch (error) {
            console.error('❌ Error obteniendo estado:', error);
            throw error;
        }
    }
}

// Ejecutar migraciones si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
    const migrationRunner = new MigrationRunner();

    const command = process.argv[2];

    switch (command) {
        case 'up':
            await migrationRunner.runMigrations();
            process.exit(0);
            break;

        case 'down':
            await migrationRunner.rollbackLastMigration();
            process.exit(0);
            break;

        case 'status':
            await migrationRunner.getStatus();
            process.exit(0);
            break;

        default:
            console.log(`
Uso: node run_migration.js [comando]

Comandos:
  up      - Ejecutar todas las migraciones pendientes
  down    - Revertir última migración
  status  - Mostrar estado de migraciones
            `);
            process.exit(1);
    }
}

export default MigrationRunner;