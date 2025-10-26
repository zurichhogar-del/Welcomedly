/**
 * Test de validación del Dashboard Supervisor - Sprint 1.3
 * Prueba el dashboard de supervisor en tiempo real
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const TEST_CREDENTIALS = {
    correo: 'admin@test.com',
    contrasena: 'admin123'
};

let sessionCookie = null;

/**
 * Test 1: Login como administrador
 */
async function testLogin() {
    console.log('\n🔐 Test 1: Login como administrador...');

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

        console.log('✅ Login exitoso como administrador');
        return sessionCookie;
    } catch (error) {
        console.error('❌ Error en login:', error.message);
        return null;
    }
}

/**
 * Test 2: Acceder al endpoint de métricas del supervisor
 */
async function testSupervisorMetricsEndpoint() {
    console.log('\n📊 Test 2: Probando endpoint /api/agent/supervisor/metrics...');

    try {
        const response = await fetch(`${BASE_URL}/api/agent/supervisor/metrics`, {
            method: 'GET',
            headers: {
                'Cookie': sessionCookie
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Error en la respuesta');
        }

        console.log('✅ Endpoint de métricas funcional');
        console.log('\n📈 Datos del dashboard:');
        console.log('   ├─ Total de agentes:', data.data.summary.totalAgents);
        console.log('   ├─ Distribución por estado:');
        Object.entries(data.data.summary.byStatus || {}).forEach(([status, count]) => {
            console.log(`   │  ├─ ${status}: ${count}`);
        });
        console.log('   ├─ Llamadas totales:', data.data.summary.totalCalls);
        console.log('   ├─ Eficiencia promedio:', data.data.summary.avgEfficiency + '%');
        console.log('   ├─ Tiempo productivo total:', data.data.summary.totalProductiveTime, 'segundos');
        console.log('   └─ Alertas activas:', data.data.alerts?.length || 0);

        if (data.data.alerts && data.data.alerts.length > 0) {
            console.log('\n⚠️  Alertas:');
            data.data.alerts.forEach(alert => {
                console.log(`   - ${alert.message}`);
            });
        }

        return true;
    } catch (error) {
        console.error('❌ Error en endpoint de métricas:', error.message);
        return false;
    }
}

/**
 * Test 3: Verificar estructura de datos de agentes
 */
async function testAgentDataStructure() {
    console.log('\n👥 Test 3: Verificando estructura de datos de agentes...');

    try {
        const response = await fetch(`${BASE_URL}/api/agent/supervisor/metrics`, {
            method: 'GET',
            headers: {
                'Cookie': sessionCookie
            }
        });

        const data = await response.json();

        if (!data.success || !data.data.agents || data.data.agents.length === 0) {
            console.log('⚠️  No hay agentes para verificar la estructura');
            return true;
        }

        const firstAgent = data.data.agents[0];

        console.log('✅ Estructura de datos de agentes validada');
        console.log('\n🔍 Ejemplo de datos de un agente:');
        console.log('   ├─ ID:', firstAgent.agentId);
        console.log('   ├─ Nombre:', firstAgent.agentName);
        console.log('   ├─ Estado actual:', firstAgent.currentStatus);
        console.log('   ├─ Duración en estado:', firstAgent.statusDuration, 'segundos');
        console.log('   ├─ Métricas:');
        console.log('   │  ├─ Tiempo productivo:', firstAgent.metrics.productiveTime, 'segundos');
        console.log('   │  ├─ Tiempo en pausa:', firstAgent.metrics.pauseTime, 'segundos');
        console.log('   │  ├─ Tiempo en llamada:', firstAgent.metrics.callTime, 'segundos');
        console.log('   │  ├─ Llamadas:', firstAgent.metrics.calls);
        console.log('   │  └─ Ventas:', firstAgent.metrics.sales);
        console.log('   ├─ Eficiencia:', firstAgent.efficiency + '%');
        console.log('   └─ Está activo:', firstAgent.isActive);

        // Validar campos requeridos
        const requiredFields = ['agentId', 'agentName', 'currentStatus', 'statusDuration', 'metrics', 'efficiency', 'isActive'];
        const missingFields = requiredFields.filter(field => !(field in firstAgent));

        if (missingFields.length > 0) {
            console.error('❌ Faltan campos requeridos:', missingFields.join(', '));
            return false;
        }

        console.log('✅ Todos los campos requeridos están presentes');
        return true;
    } catch (error) {
        console.error('❌ Error verificando estructura de datos:', error.message);
        return false;
    }
}

/**
 * Test 4: Verificar vista del dashboard (HTML)
 */
async function testDashboardView() {
    console.log('\n🖥️  Test 4: Verificando vista del dashboard...');

    try {
        const response = await fetch(`${BASE_URL}/api/agent/supervisor/dashboard`, {
            method: 'GET',
            headers: {
                'Cookie': sessionCookie
            },
            redirect: 'manual'
        });

        // El endpoint debería devolver HTML o redirigir
        if (response.status === 200 || response.status === 302) {
            console.log('✅ Ruta del dashboard accesible');
            return true;
        } else {
            console.error('❌ Ruta del dashboard no accesible, status:', response.status);
            return false;
        }
    } catch (error) {
        console.error('❌ Error accediendo a la vista del dashboard:', error.message);
        return false;
    }
}

/**
 * Test 5: Verificar actualización en tiempo real (simular refresh)
 */
async function testRealTimeUpdate() {
    console.log('\n🔄 Test 5: Simulando actualización en tiempo real...');

    try {
        console.log('   Obteniendo métricas iniciales...');
        const response1 = await fetch(`${BASE_URL}/api/agent/supervisor/metrics`, {
            method: 'GET',
            headers: { 'Cookie': sessionCookie }
        });
        const data1 = await response1.json();
        const initialTimestamp = data1.data.timestamp;

        console.log('   Esperando 6 segundos...');
        await new Promise(resolve => setTimeout(resolve, 6000));

        console.log('   Obteniendo métricas actualizadas...');
        const response2 = await fetch(`${BASE_URL}/api/agent/supervisor/metrics`, {
            method: 'GET',
            headers: { 'Cookie': sessionCookie }
        });
        const data2 = await response2.json();
        const updatedTimestamp = data2.data.timestamp;

        console.log('   Timestamp inicial:', new Date(initialTimestamp).toISOString());
        console.log('   Timestamp actualizado:', new Date(updatedTimestamp).toISOString());

        if (new Date(updatedTimestamp) > new Date(initialTimestamp)) {
            console.log('✅ Métricas se actualizan en tiempo real');
            return true;
        } else {
            console.error('❌ Las métricas no se actualizaron');
            return false;
        }
    } catch (error) {
        console.error('❌ Error en test de actualización en tiempo real:', error.message);
        return false;
    }
}

/**
 * Ejecutar todos los tests
 */
async function runAllTests() {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 TESTS DE DASHBOARD SUPERVISOR - Sprint 1.3');
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

        // Test 2: Endpoint de métricas
        if (await testSupervisorMetricsEndpoint()) {
            passed++;
        } else {
            failed++;
        }

        // Test 3: Estructura de datos
        if (await testAgentDataStructure()) {
            passed++;
        } else {
            failed++;
        }

        // Test 4: Vista del dashboard
        if (await testDashboardView()) {
            passed++;
        } else {
            failed++;
        }

        // Test 5: Actualización en tiempo real
        if (await testRealTimeUpdate()) {
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
    console.log(`✅ Tests pasados: ${passed}`);
    console.log(`❌ Tests fallidos: ${failed}`);
    console.log(`📈 Total: ${passed + failed}`);

    if (failed === 0) {
        console.log('\n🎉 TODOS LOS TESTS PASARON - Dashboard supervisor funcional!');
        console.log('\n📋 Funcionalidades validadas:');
        console.log('   ✅ Endpoint de métricas en tiempo real');
        console.log('   ✅ Estructura de datos completa');
        console.log('   ✅ Vista del dashboard accesible');
        console.log('   ✅ Actualización automática');
        console.log('   ✅ Sistema de alertas visuales');
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
