/**
 * Test básico de validación para FASE 1
 * Verifica que los archivos y estructuras básicas funcionen
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Fase1Validator {
    constructor() {
        this.results = {
            files: {},
            structure: {},
            dependencies: {},
            total: 0,
            passed: 0,
            failed: 0
        };
    }

    async validateAll() {
        console.log('🧪 INICIANDO VALIDACIÓN BÁSICA - FASE 1');
        console.log('================================================\n');

        await this.validateFiles();
        await this.validateStructure();
        await this.validateDependencies();
        await this.validateDatabase();
        await this.validateConfiguration();

        this.showResults();
        return this.results;
    }

    async validateFiles() {
        console.log('📁 Validando archivos críticos...\n');

        const criticalFiles = [
            'src/models/AgentStatus.js',
            'src/models/PauseHistory.js',
            'src/models/WorkSession.js',
            'src/services/agentStatusService.js',
            'src/controllers/agentStatusController.js',
            'src/routes/agentStatusRoutes.js',
            'src/websocket/socketHandlers.js',
            'src/views/agentsViews/agentWorkstation.ejs',
            'src/public/js/agentWorkstation.js',
            'src/public/css/agent-workstation.css',
            'src/database/migrations/001_create_agent_status_tables.sql',
            'tests/fase1.test.js'
        ];

        for (const file of criticalFiles) {
            this.testFile(file);
        }
    }

    async validateStructure() {
        console.log('🏗️ Validando estructura del proyecto...\n');

        // Validar estructura de directorios
        const requiredDirs = [
            'src/models',
            'src/services',
            'src/controllers',
            'src/routes',
            'src/views',
            'src/public',
            'src/websocket',
            'src/database/migrations',
            'tests'
        ];

        for (const dir of requiredDirs) {
            this.testDirectory(dir);
        }

        // Validar modelos principales
        try {
            const modelFiles = fs.readdirSync('src/models');
            const requiredModels = [
                'AgentStatus.js',
                'PauseHistory.js',
                'WorkSession.js'
            ];

            for (const model of requiredModels) {
                if (modelFiles.includes(model)) {
                    this.addResult('structure', `Modelo ${model}`, true, 'Encontrado');
                } else {
                    this.addResult('structure', `Modelo ${model}`, false, 'No encontrado');
                }
            }
        } catch (error) {
            this.addResult('structure', 'Directorio src/models', false, error.message);
        }
    }

    async validateDependencies() {
        console.log('📦 Validando dependencias...\n');

        try {
            const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            const requiredDeps = [
                'socket.io',
                'socket.io-client',
                'express',
                'sequelize',
                'pg'
            ];

            for (const dep of requiredDeps) {
                if (packageJson.dependencies && packageJson.dependencies[dep]) {
                    this.addResult('dependencies', `Dependencia ${dep}`, true, packageJson.dependencies[dep]);
                } else {
                    this.addResult('dependencies', `Dependencia ${dep}`, false, 'No encontrada en package.json');
                }
            }
        } catch (error) {
            this.addResult('dependencies', 'package.json', false, error.message);
        }
    }

    async validateDatabase() {
        console.log('🗄️ Validando estructura de base de datos...\n');

        try {
            const migrationFile = 'src/database/migrations/001_create_agent_status_tables.sql';
            const migrationContent = fs.readFileSync(migrationFile, 'utf8');

            // Validar tablas críticas
            const requiredTables = [
                'agent_status_log',
                'pause_history',
                'work_sessions'
            ];

            for (const table of requiredTables) {
                if (migrationContent.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) {
                    this.addResult('database', `Tabla ${table}`, true, 'Definida en migración');
                } else {
                    this.addResult('database', `Tabla ${table}`, false, 'No definida en migración');
                }
            }

            // Validar índices importantes
            const requiredIndexes = [
                'idx_agent_status_active',
                'idx_pause_active',
                'idx_session_active'
            ];

            for (const index of requiredIndexes) {
                if (migrationContent.includes(index)) {
                    this.addResult('database', `Índice ${index}`, true, 'Definido en migración');
                } else {
                    this.addResult('database', `Índice ${index}`, false, 'No definido en migración');
                }
            }

            // Validar vista de productividad
            if (migrationContent.includes('agent_productivity_view')) {
                this.addResult('database', 'Vista agent_productivity_view', true, 'Definida');
            } else {
                this.addResult('database', 'Vista agent_productivity_view', false, 'No definida');
            }

        } catch (error) {
            this.addResult('database', 'Migración SQL', false, error.message);
        }
    }

    async validateConfiguration() {
        console.log('⚙️ Validando configuración...\n');

        try {
            // Validar archivo .env.example
            const envExampleExists = fs.existsSync('.env.example');
            this.addResult('configuration', '.env.example', envExampleExists,
                envExampleExists ? 'Archivo plantilla presente' : 'Archivo plantilla faltante');

            // Validar variables de entorno requeridas
            if (envExampleExists) {
                const envExample = fs.readFileSync('.env.example', 'utf8');
                const requiredEnvVars = [
                    'DB_PASSWORD',
                    'SESSION_SECRET'
                ];

                for (const envVar of requiredEnvVars) {
                    if (envExample.includes(envVar)) {
                        this.addResult('configuration', `Variable ${envVar}`, true, 'Definida en .env.example');
                    } else {
                        this.addResult('configuration', `Variable ${envVar}`, false, 'No definida en .env.example');
                    }
                }
            }

            // Validar configuración Socket.IO en index.js
            try {
                const indexJs = fs.readFileSync('src/index.js', 'utf8');
                const hasSocketIO = indexJs.includes('SocketIOServer') && indexJs.includes('socket.io');
                this.addResult('configuration', 'Socket.IO en index.js', hasSocketIO,
                    hasSocketIO ? 'Configurado correctamente' : 'No configurado');
            } catch (error) {
                this.addResult('configuration', 'src/index.js', false, 'Error al leer: ' + error.message);
            }

        } catch (error) {
            this.addResult('configuration', 'Configuración general', false, error.message);
        }
    }

    testFile(filePath) {
        try {
            const fullPath = path.join(__dirname, filePath);
            const exists = fs.existsSync(fullPath);
            this.addResult('files', filePath, exists, exists ? 'Existe' : 'No encontrado');
        } catch (error) {
            this.addResult('files', filePath, false, 'Error: ' + error.message);
        }
    }

    testDirectory(dirPath) {
        try {
            const fullPath = path.join(__dirname, dirPath);
            const exists = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
            this.addResult('structure', dirPath, exists, exists ? 'Existe' : 'No encontrado');
        } catch (error) {
            this.addResult('structure', dirPath, false, 'Error: ' + error.message);
        }
    }

    addResult(category, item, passed, details = '') {
        this.results.total++;
        if (passed) {
            this.results.passed++;
            console.log(`  ✅ ${item}: ${details}`);
        } else {
            this.results.failed++;
            console.log(`  ❌ ${item}: ${details}`);
        }

        if (!this.results[category]) {
            this.results[category] = {};
        }
        this.results[category][item] = { passed, details };
    }

    showResults() {
        console.log('\n📊 RESULTADOS DE VALIDACIÓN - FASE 1');
        console.log('================================================');
        console.log(`Total de validaciones: ${this.results.total}`);
        console.log(`Exitosas: ${this.results.passed} ✅`);
        console.log(`Fallidas: ${this.results.failed} ❌`);

        const successRate = this.results.total > 0 ?
            Math.round((this.results.passed / this.results.total) * 100) : 0;

        console.log(`Tasa de éxito: ${successRate}%`);

        if (successRate >= 90) {
            console.log('\n🎉 FASE 1 VALIDADA EXITOSAMENTE');
            console.log('✅ Fundamentos operativos implementados correctamente');
            console.log('🚀 Listo para continuar con FASE 2');
        } else if (successRate >= 75) {
            console.log('\n⚠️ FASE 1 VALIDADA CON OBSERVACIONES');
            console.log('📋 Se requiere corrección de algunos elementos');
        } else {
            console.log('\n❌ FASE 1 REQUIERE CORRECCIONES CRÍTICAS');
            console.log('🛠️ Revisar implementación antes de continuar');
        }

        // Resumen por categoría
        console.log('\n📋 Resumen por categoría:');
        Object.keys(this.results).forEach(category => {
            if (category !== 'total' && category !== 'passed' && category !== 'failed') {
                const categoryResults = this.results[category];
                const passed = Object.values(categoryResults).filter(r => r.passed).length;
                const total = Object.values(categoryResults).length;
                const rate = Math.round((passed / total) * 100);
                const status = rate >= 80 ? '✅' : rate >= 60 ? '⚠️' : '❌';
                console.log(`  ${status} ${category}: ${passed}/${total} (${rate}%)`);
            }
        });
    }
}

// Ejecutar validación
const validator = new Fase1Validator();
validator.validateAll().catch(error => {
    console.error('❌ Error en validación:', error);
    process.exit(1);
});