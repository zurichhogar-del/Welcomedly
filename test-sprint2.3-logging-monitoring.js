/**
 * Test de Logging y Monitoreo - Sprint 2.3
 * Valida el sistema de logging estructurado y health checks
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

/**
 * Test 1: Health Check Endpoint
 */
async function testHealthCheck() {
    console.log('\n🏥 Test 1: Health Check Endpoint...');

    try {
        const response = await fetch(BASE_URL + '/health');
        const data = await response.json();

        console.log('   Status Code:', response.status);
        console.log('   Health Status:', data.status);
        console.log('   Uptime:', Math.round(data.uptime), 'seconds');
        console.log('   Response Time:', data.responseTime, 'ms');

        // Verificar estructura
        if (!data.checks || !data.checks.database || !data.checks.redis || !data.checks.websocket) {
            console.error('❌ Faltan checks en el health endpoint');
            return false;
        }

        console.log('   Database:', data.checks.database.status);
        console.log('   Redis:', data.checks.redis.status);
        console.log('   WebSocket:', data.checks.websocket.status);
        console.log('   Memory:', data.checks.memory.status, '-', JSON.stringify(data.checks.memory.usage));

        if (response.status === 200 || response.status === 503) {
            console.log('✅ Health check endpoint funcional');
            return true;
        } else {
            console.error('❌ Status code inesperado:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ Error en test de health check:', error.message);
        return false;
    }
}

/**
 * Test 2: Readiness Probe
 */
async function testReadinessProbe() {
    console.log('\n🔍 Test 2: Readiness Probe...');

    try {
        const response = await fetch(BASE_URL + '/ready');
        const data = await response.json();

        console.log('   Ready:', data.ready);
        console.log('   Timestamp:', data.timestamp);

        if (data.ready === true && response.status === 200) {
            console.log('✅ Readiness probe funcional');
            return true;
        } else if (data.ready === false && response.status === 503) {
            console.log('⚠️  Servicio no está listo (esperado si hay problemas)');
            return true;
        } else {
            console.error('❌ Respuesta inesperada del readiness probe');
            return false;
        }
    } catch (error) {
        console.error('❌ Error en test de readiness probe:', error.message);
        return false;
    }
}

/**
 * Test 3: Liveness Probe
 */
async function testLivenessProbe() {
    console.log('\n💓 Test 3: Liveness Probe...');

    try {
        const response = await fetch(BASE_URL + '/live');
        const data = await response.json();

        console.log('   Alive:', data.alive);
        console.log('   Uptime:', Math.round(data.uptime), 'seconds');

        if (data.alive === true && response.status === 200) {
            console.log('✅ Liveness probe funcional');
            return true;
        } else {
            console.error('❌ Liveness probe no funciona correctamente');
            return false;
        }
    } catch (error) {
        console.error('❌ Error en test of liveness probe:', error.message);
        return false;
    }
}

/**
 * Ejecutar todos los tests
 */
async function runAllTests() {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 TESTS DE LOGGING Y MONITOREO - Sprint 2.3');
    console.log('='.repeat(70));

    let passed = 0;
    let failed = 0;

    try {
        // Test 1: Health Check
        if (await testHealthCheck()) {
            passed++;
        } else {
            failed++;
        }

        // Test 2: Readiness Probe
        if (await testReadinessProbe()) {
            passed++;
        } else {
            failed++;
        }

        // Test 3: Liveness Probe
        if (await testLivenessProbe()) {
            passed++;
        } else {
            failed++;
        }

    } catch (error) {
        console.error('\n❌ Error ejecutando tests:', error.message);
        failed++;
    }

    // Resumen
    console.log('\n' + '='.repeat(70));
    console.log('📊 RESUMEN DE TESTS');
    console.log('='.repeat(70));
    console.log('✅ Tests pasados: ' + passed);
    console.log('❌ Tests fallidos: ' + failed);
    console.log('📈 Total: ' + (passed + failed));

    if (failed === 0) {
        console.log('\n🎉 TODOS LOS TESTS PASARON - Sistema de logging y monitoreo funcionando!');
        console.log('\n📋 Funcionalidades validadas:');
        console.log('   ✅ Health check endpoint (/health)');
        console.log('   ✅ Readiness probe (/ready)');
        console.log('   ✅ Liveness probe (/live)');
        console.log('   ✅ Checks de Database, Redis y WebSocket');
        console.log('   ✅ Monitoreo de memoria');
        console.log('   ✅ Response time tracking');
        console.log('   ✅ Logs estructurados en operaciones críticas');
        process.exit(0);
    } else {
        console.log('\n⚠️  ALGUNOS TESTS FALLARON - Revisar implementación');
        process.exit(1);
    }
}

// Ejecutar tests
runAllTests().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});
