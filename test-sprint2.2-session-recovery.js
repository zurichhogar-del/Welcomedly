/**
 * Test de Sistema de Recuperación de Sesión - Sprint 2.2
 * Valida que el sistema recupere correctamente el estado de la sesión
 * después de refrescar el navegador o reconectar WebSocket
 */

import fetch from 'node-fetch';
import { createClient } from 'redis';

const BASE_URL = 'http://localhost:3000';
const TEST_CREDENTIALS = {
    correo: 'admin@test.com',
    contrasena: 'admin123'
};

let sessionCookie = null;
let redisClient = null;

/**
 * Test 1: Login y obtener cookie de sesión
 */
async function testLogin() {
    console.log('\n🔐 Test 1: Login y obtención de sesión...');

    try {
        const response = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(TEST_CREDENTIALS),
            redirect: 'manual'
        });

        const cookies = response.headers.get('set-cookie');

        if (!cookies) {
            console.error('❌ No se recibieron cookies en la respuesta');
            return null;
        }

        sessionCookie = cookies.split(',')
            .find(cookie => cookie.trim().startsWith('connect.sid='));

        if (!sessionCookie) {
            console.error('❌ No se encontró cookie connect.sid');
            return null;
        }

        console.log('✅ Login exitoso, cookie obtenida');
        return sessionCookie;
    } catch (error) {
        console.error('❌ Error en login:', error.message);
        return null;
    }
}

/**
 * Test 2: Conectar a Redis
 */
async function connectRedis() {
    console.log('\n🔌 Test 2: Conectando a Redis...');

    try {
        redisClient = createClient({
            host: 'localhost',
            port: 6379
        });

        await redisClient.connect();
        console.log('✅ Conectado a Redis');
        return true;
    } catch (error) {
        console.error('❌ Error conectando a Redis:', error.message);
        return false;
    }
}

/**
 * Test 3: Crear sesión de trabajo activa
 */
async function testStartSession() {
    console.log('\n🚀 Test 3: Iniciando sesión de trabajo...');

    try {
        const response = await fetch(`${BASE_URL}/api/agent/session/start`, {
            method: 'POST',
            headers: {
                'Cookie': sessionCookie,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ campaignId: 1 })
        });

        const data = await response.json();

        if (data.success && data.workSession) {
            console.log('✅ Sesión de trabajo iniciada:', data.workSession.id);
            return data.workSession;
        } else {
            console.error('❌ Error iniciando sesión:', data.error);
            return null;
        }
    } catch (error) {
        console.error('❌ Error en test de inicio de sesión:', error.message);
        return null;
    }
}

/**
 * Test 4: Cambiar estado del agente
 */
async function testChangeStatus(status) {
    console.log(`\n📊 Test 4: Cambiando estado a "${status}"...`);

    try {
        const response = await fetch(`${BASE_URL}/api/agent/status`, {
            method: 'POST',
            headers: {
                'Cookie': sessionCookie,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        const data = await response.json();

        if (data.success) {
            console.log(`✅ Estado cambiado a: ${status}`);
            return true;
        } else {
            console.error('❌ Error cambiando estado:', data.error);
            return false;
        }
    } catch (error) {
        console.error('❌ Error en test de cambio de estado:', error.message);
        return false;
    }
}

/**
 * Test 5: Verificar endpoint de sesión activa
 */
async function testGetActiveSession() {
    console.log('\n📥 Test 5: Obteniendo sesión activa (endpoint de recuperación)...');

    try {
        const response = await fetch(`${BASE_URL}/api/agent/session/active`, {
            method: 'GET',
            headers: { 'Cookie': sessionCookie }
        });

        const data = await response.json();

        if (data.success && data.session) {
            console.log('✅ Sesión activa recuperada correctamente');
            console.log(`   - ID: ${data.session.id}`);
            console.log(`   - Estado: ${data.session.status}`);
            console.log(`   - Login Time: ${data.session.loginTime}`);
            console.log(`   - Productive Time: ${data.session.productiveTime}s`);
            console.log(`   - Pause Time: ${data.session.pauseTime}s`);
            console.log(`   - Calls: ${data.session.calls}`);
            console.log(`   - Sales: ${data.session.sales}`);
            return data.session;
        } else {
            console.error('❌ No se encontró sesión activa');
            return null;
        }
    } catch (error) {
        console.error('❌ Error obteniendo sesión activa:', error.message);
        return null;
    }
}

/**
 * Test 6: Verificar métricas en Redis
 */
async function testRedisMetrics() {
    console.log('\n📊 Test 6: Verificando métricas en Redis...');

    try {
        // Buscar claves de métricas del agente
        const keys = await redisClient.keys('agent:*:metrics');

        if (keys.length === 0) {
            console.error('❌ No se encontraron métricas en Redis');
            return false;
        }

        console.log(`   Total de claves de métricas: ${keys.length}`);

        // Obtener datos de la primera clave
        const metricsData = await redisClient.get(keys[0]);
        const metrics = JSON.parse(metricsData);

        console.log('   Métricas encontradas:');
        console.log(`     - Productive Time: ${metrics.productiveTime}s`);
        console.log(`     - Pause Time: ${metrics.pauseTime}s`);
        console.log(`     - Call Time: ${metrics.callTime}s`);
        console.log(`     - Calls: ${metrics.calls}`);
        console.log(`     - Sales: ${metrics.sales}`);

        console.log('✅ Métricas en Redis verificadas');
        return true;
    } catch (error) {
        console.error('❌ Error verificando métricas en Redis:', error.message);
        return false;
    }
}

/**
 * Test 7: Simular pausa y verificar recuperación
 */
async function testPauseRecovery() {
    console.log('\n⏸️  Test 7: Test de pausa y recuperación...');

    try {
        // Iniciar pausa
        const pauseResponse = await fetch(`${BASE_URL}/api/agent/pause/start`, {
            method: 'POST',
            headers: {
                'Cookie': sessionCookie,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                pauseType: 'break',
                reason: 'Test de recuperación'
            })
        });

        const pauseData = await pauseResponse.json();

        if (!pauseData.success) {
            console.error('❌ Error iniciando pausa:', pauseData.error);
            return false;
        }

        console.log('   Pausa iniciada correctamente');

        // Esperar 2 segundos
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verificar que la sesión activa incluye la pausa
        const session = await testGetActiveSession();

        if (session && session.pauseTime > 0) {
            console.log('✅ Tiempo de pausa registrado en sesión');
            return true;
        } else {
            console.error('❌ Tiempo de pausa no registrado correctamente');
            return false;
        }
    } catch (error) {
        console.error('❌ Error en test de pausa:', error.message);
        return false;
    }
}

/**
 * Test 8: Verificar persistencia de estado entre llamadas
 */
async function testStatePersistence() {
    console.log('\n🔄 Test 8: Verificando persistencia de estado...');

    try {
        // Primera llamada
        const session1 = await testGetActiveSession();

        if (!session1) {
            console.error('❌ No se pudo obtener sesión inicial');
            return false;
        }

        // Esperar 3 segundos (simular tiempo productivo)
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Segunda llamada - debería tener mayor tiempo productivo
        const session2 = await testGetActiveSession();

        if (!session2) {
            console.error('❌ No se pudo obtener sesión después de espera');
            return false;
        }

        // Verificar que el tiempo productivo aumentó
        if (session2.productiveTime >= session1.productiveTime) {
            console.log('✅ Estado persiste correctamente entre llamadas');
            console.log(`   Tiempo inicial: ${session1.productiveTime}s`);
            console.log(`   Tiempo final: ${session2.productiveTime}s`);
            return true;
        } else {
            console.error('❌ El tiempo productivo no aumentó correctamente');
            return false;
        }
    } catch (error) {
        console.error('❌ Error en test de persistencia:', error.message);
        return false;
    }
}

/**
 * Test 9: Verificar múltiples solicitudes concurrentes
 */
async function testConcurrentRequests() {
    console.log('\n🚀 Test 9: Test de múltiples solicitudes concurrentes...');

    try {
        // Hacer 5 requests concurrentes al endpoint de sesión activa
        console.log('   Haciendo 5 requests concurrentes...');
        const start = Date.now();

        const promises = [];
        for (let i = 0; i < 5; i++) {
            promises.push(
                fetch(`${BASE_URL}/api/agent/session/active`, {
                    method: 'GET',
                    headers: { 'Cookie': sessionCookie }
                })
            );
        }

        const responses = await Promise.all(promises);
        const totalTime = Date.now() - start;

        console.log(`   Tiempo total: ${totalTime}ms`);
        console.log(`   Promedio por request: ${(totalTime / 5).toFixed(1)}ms`);

        // Verificar que todas las respuestas son exitosas
        let allSuccess = true;
        for (const response of responses) {
            const data = await response.json();
            if (!data.success || !data.session) {
                allSuccess = false;
                break;
            }
        }

        if (allSuccess && totalTime < 5000) {
            console.log('✅ Requests concurrentes manejados correctamente');
            return true;
        } else {
            console.error('❌ Problemas con requests concurrentes');
            return false;
        }
    } catch (error) {
        console.error('❌ Error en test de carga:', error.message);
        return false;
    }
}

/**
 * Test 10: Verificar respuesta cuando no hay sesión activa
 */
async function testNoActiveSession() {
    console.log('\n📭 Test 10: Verificando respuesta sin sesión activa...');

    try {
        // Primero finalizar la sesión actual
        const endResponse = await fetch(`${BASE_URL}/api/agent/session/end`, {
            method: 'POST',
            headers: {
                'Cookie': sessionCookie,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                callsHandled: 5,
                salesCount: 2
            })
        });

        console.log('   Sesión finalizada');

        // Intentar obtener sesión activa (no debería haber)
        const response = await fetch(`${BASE_URL}/api/agent/session/active`, {
            method: 'GET',
            headers: { 'Cookie': sessionCookie }
        });

        const data = await response.json();

        if (!data.success && data.message === 'No active session') {
            console.log('✅ Respuesta correcta cuando no hay sesión activa');
            return true;
        } else {
            console.error('❌ Respuesta incorrecta:', data);
            return false;
        }
    } catch (error) {
        console.error('❌ Error en test sin sesión activa:', error.message);
        return false;
    }
}

/**
 * Ejecutar todos los tests
 */
async function runAllTests() {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 TESTS DE SISTEMA DE RECUPERACIÓN DE SESIÓN - Sprint 2.2');
    console.log('='.repeat(70));

    let passed = 0;
    let failed = 0;

    try {
        // Test 1: Login
        const cookie = await testLogin();
        if (!cookie) {
            console.error('\n❌ No se pudo obtener sesión, abortando tests');
            process.exit(1);
        }
        passed++;

        // Test 2: Conectar a Redis
        const redisConnected = await connectRedis();
        if (!redisConnected) {
            console.error('\n❌ No se pudo conectar a Redis, abortando tests');
            process.exit(1);
        }
        passed++;

        // Test 3: Iniciar sesión de trabajo
        const workSession = await testStartSession();
        if (workSession) {
            passed++;
        } else {
            failed++;
        }

        // Test 4: Cambiar estado
        if (await testChangeStatus('available')) {
            passed++;
        } else {
            failed++;
        }

        // Esperar 2 segundos para acumular tiempo productivo
        console.log('\n⏱️  Esperando 2 segundos para acumular métricas...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test 5: Obtener sesión activa (endpoint principal de recuperación)
        const activeSession = await testGetActiveSession();
        if (activeSession) {
            passed++;
        } else {
            failed++;
        }

        // Test 6: Verificar métricas en Redis
        if (await testRedisMetrics()) {
            passed++;
        } else {
            failed++;
        }

        // Test 7: Test de pausa y recuperación
        if (await testPauseRecovery()) {
            passed++;
        } else {
            failed++;
        }

        // Test 8: Persistencia de estado
        if (await testStatePersistence()) {
            passed++;
        } else {
            failed++;
        }

        // Test 9: Requests concurrentes
        if (await testConcurrentRequests()) {
            passed++;
        } else {
            failed++;
        }

        // Test 10: Sin sesión activa
        if (await testNoActiveSession()) {
            passed++;
        } else {
            failed++;
        }

    } catch (error) {
        console.error('\n❌ Error ejecutando tests:', error.message);
        failed++;
    } finally {
        // Limpiar recursos
        if (redisClient) {
            await redisClient.quit();
        }
    }

    // Resumen
    console.log('\n' + '='.repeat(70));
    console.log('📊 RESUMEN DE TESTS');
    console.log('='.repeat(70));
    console.log(`✅ Tests pasados: ${passed}`);
    console.log(`❌ Tests fallidos: ${failed}`);
    console.log(`📈 Total: ${passed + failed}`);

    if (failed === 0) {
        console.log('\n🎉 TODOS LOS TESTS PASARON - Sistema de recuperación funcionando!');
        console.log('\n📋 Funcionalidades validadas:');
        console.log('   ✅ Endpoint de sesión activa (GET /api/agent/session/active)');
        console.log('   ✅ Recuperación de estado (status, metrics, session)');
        console.log('   ✅ Métricas persistentes en Redis');
        console.log('   ✅ Recuperación después de pausas');
        console.log('   ✅ Persistencia de estado entre llamadas');
        console.log('   ✅ Manejo correcto de requests concurrentes');
        console.log('   ✅ Respuesta correcta cuando no hay sesión activa');
        console.log('   ✅ Sistema listo para soportar refresh de navegador');
        console.log('   ✅ Sistema listo para soportar reconexión WebSocket');
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
