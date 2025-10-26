/**
 * Test de validación de autenticación WebSocket - Sprint 1.1
 * Prueba que las conexiones WebSocket validan correctamente las sesiones
 */

import { io } from 'socket.io-client';
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
const TEST_CREDENTIALS = {
    correo: 'admin@test.com',
    contrasena: 'admin123'
};

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
            redirect: 'manual' // No seguir redirects para capturar cookies
        });

        const cookies = response.headers.get('set-cookie');

        if (!cookies) {
            console.error('❌ No se recibieron cookies en la respuesta');
            return null;
        }

        // Extraer cookie connect.sid
        const sessionCookie = cookies.split(',')
            .find(cookie => cookie.trim().startsWith('connect.sid='));

        if (!sessionCookie) {
            console.error('❌ No se encontró cookie connect.sid');
            return null;
        }

        console.log('✅ Login exitoso, cookie obtenida');
        console.log('   Cookie:', sessionCookie.substring(0, 50) + '...');

        return sessionCookie;
    } catch (error) {
        console.error('❌ Error en login:', error.message);
        return null;
    }
}

/**
 * Test 2: Conectar WebSocket con sesión válida
 */
async function testWebSocketWithValidSession(sessionCookie) {
    console.log('\n🔌 Test 2: Conexión WebSocket con sesión válida...');

    return new Promise((resolve, reject) => {
        const socket = io(BASE_URL, {
            transports: ['websocket', 'polling'],
            upgrade: true
        });

        let authenticated = false;
        let timeout;

        socket.on('connect', () => {
            console.log('   Conectado al servidor WebSocket');

            // Enviar autenticación con cookie real
            socket.emit('authenticate', {
                sessionCookie: sessionCookie
            });

            // Timeout de 5 segundos
            timeout = setTimeout(() => {
                if (!authenticated) {
                    socket.close();
                    reject(new Error('Timeout esperando autenticación'));
                }
            }, 5000);
        });

        socket.on('authenticated', (data) => {
            clearTimeout(timeout);
            authenticated = true;

            if (data.success) {
                console.log('✅ Autenticación WebSocket exitosa');
                console.log('   Usuario ID:', data.userId);
                console.log('   Rol:', data.role);
                socket.close();
                resolve(true);
            } else {
                console.error('❌ Autenticación fallida:', data.error);
                socket.close();
                reject(new Error(data.error));
            }
        });

        socket.on('error', (error) => {
            clearTimeout(timeout);
            console.error('❌ Error en WebSocket:', error);
            socket.close();
            reject(error);
        });

        socket.on('connect_error', (error) => {
            clearTimeout(timeout);
            console.error('❌ Error de conexión:', error.message);
            socket.close();
            reject(error);
        });
    });
}

/**
 * Test 3: Conectar WebSocket sin sesión (debe fallar)
 */
async function testWebSocketWithoutSession() {
    console.log('\n🚫 Test 3: Conexión WebSocket sin sesión (debe fallar)...');

    return new Promise((resolve, reject) => {
        const socket = io(BASE_URL, {
            transports: ['websocket', 'polling'],
            upgrade: true
        });

        let timeout;

        socket.on('connect', () => {
            console.log('   Conectado al servidor WebSocket');

            // Enviar autenticación sin cookie
            socket.emit('authenticate', {
                sessionCookie: ''
            });

            timeout = setTimeout(() => {
                socket.close();
                reject(new Error('Timeout esperando respuesta'));
            }, 5000);
        });

        socket.on('authenticated', (data) => {
            clearTimeout(timeout);

            if (!data.success) {
                console.log('✅ Autenticación rechazada correctamente (esperado)');
                console.log('   Error:', data.error);
                socket.close();
                resolve(true);
            } else {
                console.error('❌ ERROR: Autenticación exitosa sin sesión válida!');
                socket.close();
                reject(new Error('Autenticación no debería haber sido exitosa'));
            }
        });

        socket.on('error', (error) => {
            clearTimeout(timeout);
            socket.close();
            reject(error);
        });
    });
}

/**
 * Test 4: Conectar WebSocket con sesión inválida
 */
async function testWebSocketWithInvalidSession() {
    console.log('\n🔒 Test 4: Conexión WebSocket con sesión inválida (debe fallar)...');

    return new Promise((resolve, reject) => {
        const socket = io(BASE_URL, {
            transports: ['websocket', 'polling'],
            upgrade: true
        });

        let timeout;

        socket.on('connect', () => {
            console.log('   Conectado al servidor WebSocket');

            // Enviar autenticación con cookie falsa
            socket.emit('authenticate', {
                sessionCookie: 'connect.sid=s%3Afake-session-id.fake-signature'
            });

            timeout = setTimeout(() => {
                socket.close();
                reject(new Error('Timeout esperando respuesta'));
            }, 5000);
        });

        socket.on('authenticated', (data) => {
            clearTimeout(timeout);

            if (!data.success) {
                console.log('✅ Sesión inválida rechazada correctamente (esperado)');
                console.log('   Error:', data.error);
                socket.close();
                resolve(true);
            } else {
                console.error('❌ ERROR: Autenticación exitosa con sesión inválida!');
                socket.close();
                reject(new Error('Sesión inválida no debería ser aceptada'));
            }
        });

        socket.on('error', (error) => {
            clearTimeout(timeout);
            socket.close();
            reject(error);
        });
    });
}

/**
 * Ejecutar todos los tests
 */
async function runAllTests() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TESTS DE AUTENTICACIÓN WEBSOCKET - Sprint 1.1');
    console.log('='.repeat(60));

    let passed = 0;
    let failed = 0;

    try {
        // Test 1: Login
        const sessionCookie = await testLogin();
        if (!sessionCookie) {
            console.error('\n❌ No se pudo obtener sesión, abortando tests');
            process.exit(1);
        }
        passed++;

        // Test 2: WebSocket con sesión válida
        try {
            await testWebSocketWithValidSession(sessionCookie);
            passed++;
        } catch (error) {
            console.error('❌ Test 2 falló:', error.message);
            failed++;
        }

        // Test 3: WebSocket sin sesión
        try {
            await testWebSocketWithoutSession();
            passed++;
        } catch (error) {
            console.error('❌ Test 3 falló:', error.message);
            failed++;
        }

        // Test 4: WebSocket con sesión inválida
        try {
            await testWebSocketWithInvalidSession();
            passed++;
        } catch (error) {
            console.error('❌ Test 4 falló:', error.message);
            failed++;
        }

    } catch (error) {
        console.error('\n❌ Error ejecutando tests:', error.message);
        failed++;
    }

    // Resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE TESTS');
    console.log('='.repeat(60));
    console.log(`✅ Tests pasados: ${passed}`);
    console.log(`❌ Tests fallidos: ${failed}`);
    console.log(`📈 Total: ${passed + failed}`);

    if (failed === 0) {
        console.log('\n🎉 TODOS LOS TESTS PASARON - WebSocket auth funcional!');
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
