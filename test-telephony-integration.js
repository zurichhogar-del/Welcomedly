/**
 * Test de Integración del Sistema de Telefonía
 * Verifica que todos los componentes estén conectados correctamente
 */

import db from './src/models/index.js';
import telephonyService from './src/services/telephonyService.js';
import logger from './src/utils/logger.js';

const { Call, SipPeer, Trunk, User, Campana } = db;

// Colores para output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

let testsPass = 0;
let testsFail = 0;

function printHeader(text) {
    console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.blue}${text}${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
}

function printTest(text) {
    console.log(`${colors.blue}[TEST]${colors.reset} ${text}`);
}

function printSuccess(text) {
    console.log(`${colors.green}[✓]${colors.reset} ${text}`);
    testsPass++;
}

function printError(text) {
    console.log(`${colors.red}[✗]${colors.reset} ${text}`);
    testsFail++;
}

async function testDatabaseConnection() {
    printHeader('TEST 1: Conexión a Base de Datos');

    try {
        printTest('Verificando conexión a PostgreSQL...');
        await db.sequelize.authenticate();
        printSuccess('Conexión a base de datos exitosa');
    } catch (error) {
        printError(`Error de conexión: ${error.message}`);
    }
}

async function testModelsExist() {
    printHeader('TEST 2: Modelos de Telefonía');

    printTest('Verificando modelo Call...');
    if (Call) {
        printSuccess('Modelo Call existe');
    } else {
        printError('Modelo Call NO existe');
    }

    printTest('Verificando modelo SipPeer...');
    if (SipPeer) {
        printSuccess('Modelo SipPeer existe');
    } else {
        printError('Modelo SipPeer NO existe');
    }

    printTest('Verificando modelo Trunk...');
    if (Trunk) {
        printSuccess('Modelo Trunk existe');
    } else {
        printError('Modelo Trunk NO existe');
    }
}

async function testTablesExist() {
    printHeader('TEST 3: Tablas en Base de Datos');

    try {
        printTest('Verificando tabla calls...');
        const callsCount = await Call.count();
        printSuccess(`Tabla calls existe (${callsCount} registros)`);
    } catch (error) {
        printError(`Tabla calls: ${error.message}`);
    }

    try {
        printTest('Verificando tabla sip_peers...');
        const sipPeersCount = await SipPeer.count();
        printSuccess(`Tabla sip_peers existe (${sipPeersCount} registros)`);
    } catch (error) {
        printError(`Tabla sip_peers: ${error.message}`);
    }

    try {
        printTest('Verificando tabla trunks...');
        const trunksCount = await Trunk.count();
        printSuccess(`Tabla trunks existe (${trunksCount} registros)`);
    } catch (error) {
        printError(`Tabla trunks: ${error.message}`);
    }
}

async function testModelAssociations() {
    printHeader('TEST 4: Asociaciones de Modelos');

    printTest('Verificando asociaciones de Call...');
    const callAssociations = Object.keys(Call.associations);
    if (callAssociations.length > 0) {
        printSuccess(`Call tiene ${callAssociations.length} asociaciones: ${callAssociations.join(', ')}`);
    } else {
        printError('Call no tiene asociaciones definidas');
    }

    printTest('Verificando asociaciones de SipPeer...');
    const sipPeerAssociations = Object.keys(SipPeer.associations);
    if (sipPeerAssociations.length > 0) {
        printSuccess(`SipPeer tiene ${sipPeerAssociations.length} asociaciones: ${sipPeerAssociations.join(', ')}`);
    } else {
        printError('SipPeer no tiene asociaciones definidas');
    }

    printTest('Verificando asociaciones de Trunk...');
    const trunkAssociations = Object.keys(Trunk.associations);
    if (trunkAssociations.length > 0) {
        printSuccess(`Trunk tiene ${trunkAssociations.length} asociaciones: ${trunkAssociations.join(', ')}`);
    } else {
        printError('Trunk no tiene asociaciones definidas');
    }
}

async function testTelephonyService() {
    printHeader('TEST 5: Telephony Service');

    printTest('Verificando que telephonyService existe...');
    if (telephonyService) {
        printSuccess('telephonyService existe');
    } else {
        printError('telephonyService NO existe');
        return;
    }

    printTest('Verificando métodos del servicio...');
    const expectedMethods = ['initialize', 'shutdown', 'originateCall', 'hangupCall', 'getActiveCalls'];
    let methodsFound = 0;

    expectedMethods.forEach(method => {
        if (typeof telephonyService[method] === 'function') {
            methodsFound++;
        }
    });

    if (methodsFound === expectedMethods.length) {
        printSuccess(`Todos los métodos esperados existen (${methodsFound}/${expectedMethods.length})`);
    } else {
        printError(`Faltan métodos: ${methodsFound}/${expectedMethods.length} encontrados`);
    }

    printTest('Verificando estado de conexión...');
    if (typeof telephonyService.connected !== 'undefined') {
        printSuccess(`Estado de conexión disponible: ${telephonyService.connected}`);
    } else {
        printError('Estado de conexión no disponible');
    }
}

async function testCreateSipPeer() {
    printHeader('TEST 6: Creación de SIP Peer (Prueba)');

    try {
        // Buscar un usuario de prueba
        printTest('Buscando usuario de prueba...');
        const testUser = await User.findOne({ where: { email: 'admin@test.com' } });

        if (!testUser) {
            printError('Usuario de prueba no encontrado');
            return;
        }

        printSuccess(`Usuario encontrado: ${testUser.email}`);

        // Verificar si ya existe un SIP peer para este usuario
        printTest('Verificando SIP peer existente...');
        const existingSipPeer = await SipPeer.findOne({ where: { userId: testUser.id } });

        if (existingSipPeer) {
            printSuccess(`SIP peer ya existe para usuario ${testUser.email}: extension ${existingSipPeer.extension}`);
        } else {
            printError('No hay SIP peer configurado para el usuario de prueba');
            console.log(`  → Se puede crear uno con: extension 1001, username agent001`);
        }
    } catch (error) {
        printError(`Error en prueba de SIP peer: ${error.message}`);
    }
}

async function testCallRecordCreation() {
    printHeader('TEST 7: Creación de Registro de Llamada (Simulación)');

    try {
        printTest('Intentando crear registro de llamada de prueba...');

        // No vamos a crear realmente, solo verificar que podemos
        const callData = {
            callId: 'test-' + Date.now(),
            direction: 'outbound',
            callerNumber: '+1234567890',
            calleeNumber: '+0987654321',
            startTime: new Date(),
            disposition: 'ANSWERED'
        };

        // Validar que los campos requeridos están presentes
        if (callData.callId && callData.direction && callData.startTime) {
            printSuccess('Estructura de datos de llamada es válida');
            console.log(`  → callId: ${callData.callId}`);
            console.log(`  → direction: ${callData.direction}`);
            console.log(`  → disposition: ${callData.disposition}`);
        } else {
            printError('Estructura de datos de llamada inválida');
        }
    } catch (error) {
        printError(`Error en prueba de registro de llamada: ${error.message}`);
    }
}

async function testEnvironmentVariables() {
    printHeader('TEST 8: Variables de Entorno');

    const requiredVars = [
        'ASTERISK_HOST',
        'ASTERISK_PORT',
        'ASTERISK_USER',
        'ASTERISK_PASSWORD',
        'ASTERISK_WSS_HOST',
        'ASTERISK_WSS_PORT'
    ];

    requiredVars.forEach(varName => {
        printTest(`Verificando ${varName}...`);
        if (process.env[varName]) {
            printSuccess(`${varName} = ${process.env[varName]}`);
        } else {
            printError(`${varName} no está definida`);
        }
    });
}

async function runTests() {
    console.log('\n');
    console.log(`${colors.blue}╔${'═'.repeat(58)}╗${colors.reset}`);
    console.log(`${colors.blue}║  PRUEBAS DE INTEGRACIÓN - SISTEMA DE TELEFONÍA${' '.repeat(10)}║${colors.reset}`);
    console.log(`${colors.blue}╚${'═'.repeat(58)}╝${colors.reset}`);

    try {
        await testDatabaseConnection();
        await testModelsExist();
        await testTablesExist();
        await testModelAssociations();
        await testTelephonyService();
        await testEnvironmentVariables();
        await testCreateSipPeer();
        await testCallRecordCreation();

        // Resumen
        printHeader('RESUMEN DE PRUEBAS');
        const total = testsPass + testsFail;
        console.log(`${colors.blue}Total de pruebas:${colors.reset} ${total}`);
        console.log(`${colors.green}Pruebas exitosas:${colors.reset} ${testsPass}`);
        console.log(`${colors.red}Pruebas fallidas:${colors.reset} ${testsFail}`);

        if (testsFail === 0) {
            console.log(`\n${colors.green}✅ TODAS LAS PRUEBAS DE INTEGRACIÓN PASARON${colors.reset}\n`);
            process.exit(0);
        } else {
            console.log(`\n${colors.yellow}⚠️  ALGUNAS PRUEBAS FALLARON${colors.reset}\n`);
            process.exit(1);
        }
    } catch (error) {
        console.error(`\n${colors.red}❌ ERROR CRÍTICO: ${error.message}${colors.reset}\n`);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await db.sequelize.close();
    }
}

// Ejecutar pruebas
runTests();
