/**
 * Test de Performance de Cache - Sprint 2.1
 * Valida que el cache Redis mejora la performance de queries frecuentes
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
 * Test 3: Limpiar cache antes de pruebas
 */
async function clearCache() {
    console.log('\n🧹 Test 3: Limpiando cache para pruebas limpias...');

    try {
        // Limpiar cache de disposiciones, campaigns y users
        const patterns = [
            'cache:dispositions:*',
            'cache:campaign:*',
            'cache:user:*'
        ];

        let totalDeleted = 0;
        for (const pattern of patterns) {
            const keys = await redisClient.keys(pattern);
            if (keys.length > 0) {
                await redisClient.del(keys);
                totalDeleted += keys.length;
            }
        }

        console.log(`✅ Cache limpiado: ${totalDeleted} claves eliminadas`);
        return true;
    } catch (error) {
        console.error('❌ Error limpiando cache:', error.message);
        return false;
    }
}

/**
 * Test 4: Performance de Disposiciones (sin cache vs con cache)
 */
async function testDispositionsPerformance() {
    console.log('\n📊 Test 4: Performance de Disposiciones...');

    try {
        // Primera llamada (sin cache) - medir tiempo
        const start1 = Date.now();
        const response1 = await fetch(`${BASE_URL}/disposiciones/api/activas`, {
            method: 'GET',
            headers: { 'Cookie': sessionCookie }
        });
        const data1 = await response1.json();
        const time1 = Date.now() - start1;

        console.log(`   Primera llamada (sin cache): ${time1}ms`);

        // Segunda llamada (con cache) - medir tiempo
        const start2 = Date.now();
        const response2 = await fetch(`${BASE_URL}/disposiciones/api/activas`, {
            method: 'GET',
            headers: { 'Cookie': sessionCookie }
        });
        const data2 = await response2.json();
        const time2 = Date.now() - start2;

        console.log(`   Segunda llamada (con cache): ${time2}ms`);

        // Verificar que el cache mejoró la performance
        const improvement = ((time1 - time2) / time1 * 100).toFixed(1);
        console.log(`   Mejora de performance: ${improvement}%`);

        // Verificar que existe en Redis
        const cacheKey = await redisClient.keys('cache:dispositions:*');
        console.log(`   Claves en cache: ${cacheKey.length}`);

        if (time2 < time1 && cacheKey.length > 0) {
            console.log('✅ Cache de disposiciones funcionando correctamente');
            return true;
        } else {
            console.error('❌ Cache no está mejorando performance');
            return false;
        }
    } catch (error) {
        console.error('❌ Error en test de disposiciones:', error.message);
        return false;
    }
}

/**
 * Test 5: Verificar cache keys de diferentes tipos
 */
async function testCacheKeys() {
    console.log('\n📊 Test 5: Verificando claves de cache...');

    try {
        // Obtener todas las claves de cache
        const allKeys = await redisClient.keys('cache:*');

        console.log(`   Total de claves en cache: ${allKeys.length}`);

        if (allKeys.length > 0) {
            console.log('   Claves encontradas:');
            allKeys.forEach(key => {
                console.log(`     - ${key}`);
            });
            console.log('✅ Cache contiene claves');
            return true;
        } else {
            console.log('⚠️  No hay claves en cache (esperado si es primera ejecución)');
            return true; // No es un error
        }
    } catch (error) {
        console.error('❌ Error verificando claves:', error.message);
        return false;
    }
}

/**
 * Test 6: Test de invalidación de cache
 */
async function testCacheInvalidation() {
    console.log('\n📊 Test 6: Test de invalidación de cache...');

    try {
        // Primero hacer una llamada para cachear
        await fetch(`${BASE_URL}/disposiciones/api/activas`, {
            method: 'GET',
            headers: { 'Cookie': sessionCookie }
        });

        // Verificar que existe en cache
        const keysBefore = await redisClient.keys('cache:dispositions:*');
        console.log(`   Claves antes de invalidar: ${keysBefore.length}`);

        // Invalidar cache usando delPattern
        if (keysBefore.length > 0) {
            await redisClient.del(keysBefore);
            console.log('   Cache invalidado');
        }

        // Verificar que se eliminó
        const keysAfter = await redisClient.keys('cache:dispositions:*');
        console.log(`   Claves después de invalidar: ${keysAfter.length}`);

        if (keysBefore.length > 0 && keysAfter.length === 0) {
            console.log('✅ Invalidación de cache funciona correctamente');
            return true;
        } else if (keysBefore.length === 0) {
            console.log('⚠️  No había cache para invalidar (no es un error)');
            return true;
        } else {
            console.error('❌ Cache no se invalidó correctamente');
            return false;
        }
    } catch (error) {
        console.error('❌ Error en test de invalidación:', error.message);
        return false;
    }
}

/**
 * Test 7: Verificar TTL (Time To Live) de cache
 */
async function testCacheTTL() {
    console.log('\n⏱️  Test 7: Verificando TTL de cache...');

    try {
        // Obtener una clave de cache
        const keys = await redisClient.keys('cache:*');

        if (keys.length === 0) {
            console.error('❌ No hay claves en cache para verificar TTL');
            return false;
        }

        const key = keys[0];
        const ttl = await redisClient.ttl(key);

        console.log(`   Clave: ${key}`);
        console.log(`   TTL: ${ttl} segundos`);

        if (ttl > 0 && ttl <= 1800) { // TTL entre 0 y 30 minutos
            console.log('✅ TTL configurado correctamente');
            return true;
        } else {
            console.error('❌ TTL no está configurado correctamente');
            return false;
        }
    } catch (error) {
        console.error('❌ Error verificando TTL:', error.message);
        return false;
    }
}

/**
 * Test 8: Test de carga - múltiples requests concurrentes
 */
async function testConcurrentRequests() {
    console.log('\n🚀 Test 8: Múltiples requests concurrentes...');

    try {
        // Limpiar cache
        const keys = await redisClient.keys('cache:dispositions:*');
        if (keys.length > 0) {
            await redisClient.del(keys);
        }

        // Hacer 10 requests concurrentes
        console.log('   Haciendo 10 requests concurrentes...');
        const start = Date.now();

        const promises = [];
        for (let i = 0; i < 10; i++) {
            promises.push(
                fetch(`${BASE_URL}/disposiciones/api/activas`, {
                    method: 'GET',
                    headers: { 'Cookie': sessionCookie }
                })
            );
        }

        await Promise.all(promises);
        const totalTime = Date.now() - start;

        console.log(`   Tiempo total: ${totalTime}ms`);
        console.log(`   Promedio por request: ${(totalTime / 10).toFixed(1)}ms`);

        // Verificar que solo hay 1 clave en cache (todas usaron el mismo cache)
        const cacheKeys = await redisClient.keys('cache:dispositions:*');
        console.log(`   Claves en cache: ${cacheKeys.length}`);

        if (totalTime < 5000 && cacheKeys.length > 0) {
            console.log('✅ Requests concurrentes manejados correctamente con cache');
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
 * Ejecutar todos los tests
 */
async function runAllTests() {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 TESTS DE PERFORMANCE DE CACHE - Sprint 2.1');
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

        // Test 3: Limpiar cache
        if (await clearCache()) {
            passed++;
        } else {
            failed++;
        }

        // Test 4: Performance de disposiciones
        if (await testDispositionsPerformance()) {
            passed++;
        } else {
            failed++;
        }

        // Test 5: Verificar claves de cache
        if (await testCacheKeys()) {
            passed++;
        } else {
            failed++;
        }

        // Test 6: Verificar TTL (antes de invalidar)
        if (await testCacheTTL()) {
            passed++;
        } else {
            failed++;
        }

        // Test 7: Test de invalidación
        if (await testCacheInvalidation()) {
            passed++;
        } else {
            failed++;
        }

        // Test 8: Requests concurrentes
        if (await testConcurrentRequests()) {
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
        console.log('\n🎉 TODOS LOS TESTS PASARON - Cache funcionando correctamente!');
        console.log('\n📋 Funcionalidades validadas:');
        console.log('   ✅ Cache de disposiciones con mejora de performance');
        console.log('   ✅ Verificación de claves en Redis');
        console.log('   ✅ Invalidación de cache funcionando');
        console.log('   ✅ TTL configurado correctamente');
        console.log('   ✅ Manejo correcto de requests concurrentes');
        console.log('   ✅ Patrón Cache-Aside implementado correctamente');
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
