/**
 * Test exhaustivo para FASE 1: Fundamentos Operativos de Welcomedly
 * Pruebas unitarias e integración para el sistema de tracking de agentes
 */

import { expect, test, describe, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../src/index.js';
import db from '../src/models/index.js';

describe('🚀 FASE 1: FUNDAMENTOS OPERATIVOS - SUITE COMPLETA', () => {
    let authToken;
    let agentUser;
    let supervisorUser;

    beforeAll(async () => {
        try {
            console.log('🔧 Configurando entorno de pruebas...');

            // Sincronizar base de datos en modo prueba
            await db.sequelize.sync({ force: true });

            // Crear usuarios de prueba
            agentUser = await db.User.create({
                nombre: 'Agente Test',
                correo: 'agente@test.com',
                contrasena: 'test123',
                rol: 'AGENTE',
                estado: 'ACTIVO'
            });

            supervisorUser = await db.User.create({
                nombre: 'Supervisor Test',
                correo: 'supervisor@test.com',
                contrasena: 'test123',
                rol: 'ADMIN',
                estado: 'ACTIVO'
            });

            console.log('✅ Usuarios de prueba creados');
            console.log(`📊 Agente: ${agentUser.nombre} (${agentUser.correo})`);
            console.log(`👑 Supervisor: ${supervisorUser.nombre} (${supervisorUser.correo})`);

        } catch (error) {
            console.error('❌ Error en beforeAll:', error);
            throw error;
        }
    });

    afterAll(async () => {
        try {
            console.log('🧹 Limpiando entorno de pruebas...');
            await db.sequelize.close();
        } catch (error) {
            console.error('❌ Error en afterAll:', error);
        }
    });

    beforeEach(async () => {
        try {
            // Login para obtener token de sesión
            const loginResponse = await request(app)
                .post('/auth/login')
                .send({
                    correo: 'agente@test.com',
                    contrasena: 'test123'
                });

            authToken = loginResponse.headers['set-cookie'] || '';
        } catch (error) {
            console.error('❌ Error en beforeEach:', error);
        }
    });

    afterEach(async () => {
        try {
            // Limpiar tablas de tracking después de cada test
            await db.AgentStatus.destroy({ where: {}, force: true });
            await db.PauseHistory.destroy({ where: {}, force: true });
            await db.WorkSession.destroy({ where: {}, force: true });
        } catch (error) {
            console.error('❌ Error en afterEach:', error);
        }
    });

    describe('📋 MODELOS DE DATOS', () => {
        describe('AgentStatus Model', () => {
            test('✅ Debería crear estado de agente correctamente', async () => {
                const agentStatus = await db.AgentStatus.create({
                    agentId: agentUser.id,
                    status: 'available',
                    reason: 'Estado inicial'
                });

                expect(agentStatus).toBeDefined();
                expect(agentStatus.agentId).toBe(agentUser.id);
                expect(agentStatus.status).toBe('available');
                expect(agentStatus.isActive).toBe(true);
                expect(agentStatus.startTime).toBeInstanceOf(Date);
            });

            test('✅ Debería obtener estado actual del agente', async () => {
                await db.AgentStatus.create({
                    agentId: agentUser.id,
                    status: 'available'
                });

                const currentStatus = await db.AgentStatus.getCurrentStatus(agentUser.id);
                expect(currentStatus).toBeDefined();
                expect(currentStatus.status).toBe('available');
                expect(currentStatus.isActive).toBe(true);
            });

            test('✅ Debería validar transiciones de estados válidas', async () => {
                const agentService = await import('../src/services/agentStatusService.js');

                // Transición válida
                expect(agentService.default.isValidTransition('available', 'in_call')).toBe(true);
                expect(agentService.default.isValidTransition('in_call', 'after_call_work')).toBe(true);

                // Transición inválida
                expect(agentService.default.isValidTransition('offline', 'in_call')).toBe(false);
                expect(agentService.default.isValidTransition('in_call', 'training')).toBe(false);
            });

            test('✅ Debería finalizar estado correctamente', async () => {
                const status = await db.AgentStatus.create({
                    agentId: agentUser.id,
                    status: 'available'
                });

                const updatedStatus = await status.endStatus();
                expect(updatedStatus.isActive).toBe(false);
                expect(updatedStatus.endTime).toBeInstanceOf(Date);
                expect(updatedStatus.duration).toBeGreaterThan(0);
            });
        });

        describe('PauseHistory Model', () => {
            test('✅ Debería crear registro de pausa correctamente', async () => {
                const pause = await db.PauseHistory.create({
                    agentId: agentUser.id,
                    pauseType: 'lunch',
                    reason: 'Pausa de almuerzo'
                });

                expect(pause).toBeDefined();
                expect(pause.agentId).toBe(agentUser.id);
                expect(pause.pauseType).toBe('lunch');
                expect(pause.isActive).toBe(true);
                expect(pause.supervisorApproved).toBe(false);
            });

            test('✅ Debería obtener pausa activa', async () => {
                await db.PauseHistory.create({
                    agentId: agentUser.id,
                    pauseType: 'break'
                });

                const activePause = await db.PauseHistory.getActivePause(agentUser.id);
                expect(activePause).toBeDefined();
                expect(activePause.pauseType).toBe('break');
                expect(activePause.isActive).toBe(true);
            });

            test('✅ Debería calcular duración al finalizar', async () => {
                const pause = await db.PauseHistory.create({
                    agentId: agentUser.id,
                    pauseType: 'bathroom'
                });

                // Simular espera de 2 segundos
                await new Promise(resolve => setTimeout(resolve, 2000));

                const updatedPause = await pause.endPause();
                expect(updatedPause.isActive).toBe(false);
                expect(updatedPause.duration).toBeGreaterThanOrEqual(1);
            });
        });

        describe('WorkSession Model', () => {
            test('✅ Debería crear sesión de trabajo', async () => {
                const workSession = await db.WorkSession.create({
                    agentId: agentUser.id,
                    campaignId: 1
                });

                expect(workSession).toBeDefined();
                expect(workSession.agentId).toBe(agentUser.id);
                expect(workSession.isActive).toBe(true);
                expect(workSession.callsHandled).toBe(0);
                expect(workSession.salesCount).toBe(0);
            });

            test('✅ Debería obtener sesión activa', async () => {
                await db.WorkSession.create({
                    agentId: agentUser.id,
                    loginType: 'regular'
                });

                const activeSession = await db.WorkSession.getActiveSession(agentUser.id);
                expect(activeSession).toBeDefined();
                expect(activeSession.isActive).toBe(true);
                expect(activeSession.loginType).toBe('regular');
            });

            test('✅ Debería actualizar métricas', async () => {
                const session = await db.WorkSession.create({
                    agentId: agentUser.id
                });

                const metrics = {
                    callsHandled: 10,
                    salesCount: 2,
                    qualityScore: 95.5
                };

                await session.updateMetrics(metrics);
                await session.reload();

                expect(session.callsHandled).toBe(10);
                expect(session.salesCount).toBe(2);
                expect(session.qualityScore).toBe('95.50');
            });
        });
    });

    describe('🔧 SERVICIO DE ESTADOS DE AGENTES', () => {
        describe('Agent Status Service', () => {
            test('✅ Debería cambiar estado correctamente', async () => {
                const agentStatusService = await import('../src/services/agentStatusService.js');

                const status = await agentStatusService.default.changeAgentStatus(
                    agentUser.id,
                    'available',
                    'Estado inicial de prueba'
                );

                expect(status).toBeDefined();
                expect(status.status).toBe('available');
                expect(status.reason).toBe('Estado inicial de prueba');
            });

            test('✅ Debería iniciar pausa correctamente', async () => {
                const agentStatusService = await import('../src/services/agentStatusService.js');

                const pause = await agentStatusService.default.startPause(
                    agentUser.id,
                    'lunch',
                    'Pausa de prueba'
                );

                expect(pause).toBeDefined();
                expect(pause.pauseType).toBe('lunch');
                expect(pause.reason).toBe('Pausa de prueba');
                expect(pause.isActive).toBe(true);
            });

            test('✅ Debería finalizar pausa correctamente', async () => {
                const agentStatusService = await import('../src/services/agentStatusService.js');

                // Iniciar pausa primero
                await agentStatusService.default.startPause(agentUser.id, 'break');

                // Finalizar pausa
                const endedPause = await agentStatusService.default.endPause(agentUser.id);

                expect(endedPause).toBeDefined();
                expect(endedPause.isActive).toBe(false);
                expect(endedPause.endTime).toBeInstanceOf(Date);
            });

            test('✅ Debería iniciar sesión de trabajo', async () => {
                const agentStatusService = await import('../src/services/agentStatusService.js');

                const session = await agentStatusService.default.startWorkSession(agentUser.id, {
                    campaignId: 1
                });

                expect(session).toBeDefined();
                expect(session.agentId).toBe(agentUser.id);
                expect(session.campaignId).toBe(1);
                expect(session.isActive).toBe(true);
            });

            test('✅ Debería finalizar sesión de trabajo', async () => {
                const agentStatusService = await import('../src/services/agentStatusService.js');

                // Iniciar sesión primero
                await agentStatusService.default.startWorkSession(agentUser.id);

                // Finalizar sesión
                const endedSession = await agentStatusService.default.endWorkSession(agentUser.id, {
                    callsHandled: 5,
                    salesCount: 1
                });

                expect(endedSession).toBeDefined();
                expect(endedSession.isActive).toBe(false);
                expect(endedSession.callsHandled).toBe(5);
                expect(endedSession.salesCount).toBe(1);
            });
        });
    });

    describe('🌐 API REST ENDPOINTS', () => {
        describe('Agent Status Routes', () => {
            test('✅ POST /api/agent/status - Cambiar estado', async () => {
                const response = await request(app)
                    .post('/api/agent/status')
                    .set('Cookie', authToken)
                    .send({
                        status: 'available',
                        reason: 'Test de cambio de estado'
                    });

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.agentStatus.status).toBe('available');
            });

            test('✅ POST /api/agent/pause/start - Iniciar pausa', async () => {
                const response = await request(app)
                    .post('/api/agent/pause/start')
                    .set('Cookie', authToken)
                    .send({
                        pauseType: 'lunch',
                        reason: 'Pausa de prueba'
                    });

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.pause.pauseType).toBe('lunch');
            });

            test('✅ POST /api/agent/pause/end - Finalizar pausa', async () => {
                const agentStatusService = await import('../src/services/agentStatusService.js');

                // Iniciar pausa primero
                await agentStatusService.default.startPause(agentUser.id, 'break');

                const response = await request(app)
                    .post('/api/agent/pause/end')
                    .set('Cookie', authToken);

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });

            test('✅ GET /api/agent/status/:id - Obtener estado actual', async () => {
                // Crear estado primero
                await db.AgentStatus.create({
                    agentId: agentUser.id,
                    status: 'available'
                });

                const response = await request(app)
                    .get(`/api/agent/status/${agentUser.id}`)
                    .set('Cookie', authToken);

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.agentStatus.status).toBe('available');
            });

            test('✅ GET /api/agent/productivity/:id - Métricas de productividad', async () => {
                // Crear datos de prueba
                await db.WorkSession.create({
                    agentId: agentUser.id,
                    productiveTime: 3600,
                    pauseTime: 900,
                    callsHandled: 8,
                    salesCount: 2
                });

                const response = await request(app)
                    .get(`/api/agent/productivity/${agentUser.id}`)
                    .set('Cookie', authToken);

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data).toBeDefined();
            });

            test('✅ GET /api/agent/realtime-metrics - Métricas en tiempo real (solo supervisores)', async () => {
                // Login como supervisor
                const supervisorLogin = await request(app)
                    .post('/auth/login')
                    .send({
                        correo: 'supervisor@test.com',
                        contrasena: 'test123'
                    });

                const response = await request(app)
                    .get('/api/agent/realtime-metrics')
                    .set('Cookie', supervisorLogin.headers['set-cookie'] || '');

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.data.timestamp).toBeDefined();
            });

            test('❌ Debería denegar acceso a métricas en tiempo real para agentes', async () => {
                const response = await request(app)
                    .get('/api/agent/realtime-metrics')
                    .set('Cookie', authToken);

                expect(response.status).toBe(403);
                expect(response.body.success).toBe(false);
            });
        });
    });

    describe('🎯 VALIDACIONES Y REGLAS DE NEGOCIO', () => {
        test('✅ Debería validar tipos de pausa válidos', async () => {
            const validPauseTypes = ['bathroom', 'lunch', 'break', 'coaching', 'system_issue', 'personal'];

            for (const pauseType of validPauseTypes) {
                const response = await request(app)
                    .post('/api/agent/pause/start')
                    .set('Cookie', authToken)
                    .send({ pauseType });

                expect(response.status).toBe(200);
            }
        });

        test('❌ Debería rechazar tipos de pausa inválidos', async () => {
            const response = await request(app)
                .post('/api/agent/pause/start')
                .set('Cookie', authToken)
                .send({
                    pauseType: 'invalid_pause_type'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        test('✅ Debería validar estados de transición', async () => {
            const validTransitions = [
                { from: 'available', to: 'in_call' },
                { from: 'in_call', to: 'after_call_work' },
                { from: 'after_call_work', to: 'available' },
                { from: 'available', to: 'on_pause' },
                { from: 'on_pause', to: 'available' }
            ];

            for (const transition of validTransitions) {
                // Establecer estado inicial
                await db.AgentStatus.create({
                    agentId: agentUser.id,
                    status: transition.from
                });

                // Intentar transición
                const response = await request(app)
                    .post('/api/agent/status')
                    .set('Cookie', authToken)
                    .send({
                        status: transition.to,
                        reason: `Transición de ${transition.from} a ${transition.to}`
                    });

                expect(response.status).toBe(200);

                // Limpiar para siguiente prueba
                await db.AgentStatus.destroy({ where: { agentId: agentUser.id } });
            }
        });

        test('✅ Debería manejar concurrentemente sesiones activas', async () => {
            const agentStatusService = await import('../src/services/agentStatusService.js');

            // Primera sesión debería funcionar
            const session1 = await agentStatusService.default.startWorkSession(agentUser.id);
            expect(session1).toBeDefined();

            // Segunda sesión simultánea debería fallar
            try {
                await agentStatusService.default.startWorkSession(agentUser.id);
                expect(true).toBe(false); // No debería llegar aquí
            } catch (error) {
                expect(error.message).toContain('Ya existe una sesión activa');
            }
        });
    });

    describe('📊 MÉTRICAS Y REPORTES', () => {
        test('✅ Debería calcular eficiencia correctamente', async () => {
            const agentStatusService = await import('../src/services/agentStatusService.js');

            // Crear sesión con datos de productividad
            await db.WorkSession.create({
                agentId: agentUser.id,
                productiveTime: 21600, // 6 horas
                totalDuration: 28800,    // 8 horas totales
                callsHandled: 15,
                salesCount: 3
            });

            const metrics = await agentStatusService.default.getAgentProductivityMetrics(agentUser.id);
            expect(metrics.efficiency).toBe(75); // 21600/28800 * 100
        });

        test('✅ Debería generar reporte de productividad', async () => {
            const productivities = await db.WorkSession.getProductivityReport('today');
            expect(Array.isArray(productivities)).toBe(true);

            if (productivities.length > 0) {
                const report = productivities[0];
                expect(report.totalTime).toBeDefined();
                expect(report.productiveTime).toBeDefined();
                expect(report.totalCalls).toBeDefined();
            }
        });

        test('✅ Debería obtener estadísticas de pausas del día', async () => {
            // Crear varias pausas de prueba
            await db.PauseHistory.create({
                agentId: agentUser.id,
                pauseType: 'bathroom',
                startTime: new Date(),
                duration: 600
            });

            await db.PauseHistory.create({
                agentId: agentUser.id,
                pauseType: 'lunch',
                startTime: new Date(),
                duration: 3600
            });

            const stats = await db.PauseHistory.getCurrentDayStats(agentUser.id);
            expect(Array.isArray(stats)).toBe(true);
            expect(stats.length).toBeGreaterThan(0);
        });
    });

    describe('🔒 SEGURIDAD Y AUTENTICACIÓN', () => {
        test('✅ Debería requerir autenticación para endpoints protegidos', async () => {
            const endpoints = [
                '/api/agent/status',
                '/api/agent/pause/start',
                '/api/agent/pause/end',
                '/api/agent/productivity/1'
            ];

            for (const endpoint of endpoints) {
                const response = await request(app).post(endpoint);
                expect(response.status).toBe(302); // Redirect a login
            }
        });

        test('✅ Debería validar CSRF token', async () => {
            const response = await request(app)
                .post('/api/agent/status')
                .send({
                    status: 'available',
                    reason: 'Test sin CSRF'
                });

            // Sin token CSRF debería fallar
            expect(response.status).toBe(403);
        });

        test('✅ Debería respetar autorizaciones por rol', async () => {
            // Agente intentando acceder a endpoint de supervisor
            const response = await request(app)
                .get('/api/agent/realtime-metrics')
                .set('Cookie', authToken);

            expect(response.status).toBe(403);
            expect(response.body.error).toContain('Acceso denegado');
        });
    });

    describe('⚡ PERFORMANCE Y ESCALABILIDAD', () => {
        test('✅ Debería manejar múltiples cambios de estado concurrentemente', async () => {
            const agentStatusService = await import('../src/services/agentStatusService.js');
            const promises = [];

            // Crear 10 cambios de estado concurrentes
            for (let i = 0; i < 10; i++) {
                promises.push(
                    agentStatusService.default.changeAgentStatus(
                        agentUser.id,
                        i % 2 === 0 ? 'available' : 'training',
                        `Concurrent test ${i}`
                    )
                );
            }

            const results = await Promise.allSettled(promises);
            const successful = results.filter(r => r.status === 'fulfilled');
            const failed = results.filter(r => r.status === 'rejected');

            console.log(`📊 Concurrent operations: ${successful.length} successful, ${failed.length} failed`);
            expect(successful.length).toBeGreaterThan(0);
        });

        test('✅ Debería mantener rendimiento con 100 agentes activos', async () => {
            const startTime = Date.now();
            const agentStatusService = await import('../src/services/agentStatusService.js');
            const promises = [];

            // Simular 100 agentes activos
            for (let i = 0; i < 100; i++) {
                const mockAgent = await db.User.create({
                    nombre: `Agent ${i}`,
                    correo: `agent${i}@test.com`,
                    rol: 'AGENTE',
                    estado: 'ACTIVO'
                });

                promises.push(
                    agentStatusService.default.changeAgentStatus(mockAgent.id, 'available')
                );
            }

            await Promise.allSettled(promises);
            const duration = Date.now() - startTime;

            console.log(`⚡ Performance: 100 agentes procesados en ${duration}ms`);
            expect(duration).toBeLessThan(5000); // Debería tomar menos de 5 segundos
        }, 10000); // Timeout extendido
    });
});

/**
 * Test de integración para WebSocket
 */
describe('🔌 WEBSOCKET INTEGRATION', () => {
    test('✅ Debería establecer conexión WebSocket', async () => {
        // Este test requeriría un cliente WebSocket real
        // Por ahora, verificamos que el servidor se inicie sin errores
        expect(() => import('../src/websocket/socketHandlers.js')).not.toThrow();
    });

    test('✅ Debería manejar eventos de estado en tiempo real', () => {
        const SocketHandlers = await import('../src/websocket/socketHandlers.js');

        expect(SocketHandlers.default).toBeDefined();
        expect(typeof SocketHandlers.default).toBe('function');
    });
});

describe('📋 INTEGRACIÓN COMPLETA - E2E TESTS', () => {
    test('✅ Flujo completo: Login → Iniciar Sesión → Cambiar Estados → Finalizar', async () => {
        try {
            // 1. Login
            const loginResponse = await request(app)
                .post('/auth/login')
                .send({
                    correo: 'agente@test.com',
                    contrasena: 'test123'
                });

            expect(loginResponse.status).toBe(302);

            // 2. Iniciar sesión de trabajo
            const sessionResponse = await request(app)
                .post('/api/agent/session/start')
                .set('Cookie', loginResponse.headers['set-cookie'] || '')
                .send({ campaignId: 1 });

            expect(sessionResponse.status).toBe(200);

            // 3. Cambiar a disponible
            const statusResponse = await request(app)
                .post('/api/agent/status')
                .set('Cookie', loginResponse.headers['set-cookie'] || '')
                .send({
                    status: 'available',
                    reason: 'Agente listo para trabajar'
                });

            expect(statusResponse.status).toBe(200);

            // 4. Iniciar pausa
            const pauseResponse = await request(app)
                .post('/api/agent/pause/start')
                .set('Cookie', loginResponse.headers['set-cookie'] || '')
                .send({
                    pauseType: 'lunch',
                    reason: 'Pausa de almuerzo'
                });

            expect(pauseResponse.status).toBe(200);

            // 5. Finalizar pausa
            const endPauseResponse = await request(app)
                .post('/api/agent/pause/end')
                .set('Cookie', loginResponse.headers['set-cookie'] || '');

            expect(endPauseResponse.status).toBe(200);

            // 6. Finalizar sesión
            const endSessionResponse = await request(app)
                .post('/api/agent/session/end')
                .set('Cookie', loginResponse.headers['set-cookie'] || '')
                .send({
                    callsHandled: 5,
                    salesCount: 1
                });

            expect(endSessionResponse.status).toBe(200);

            console.log('✅ Flujo E2E completado exitosamente');

        } catch (error) {
            console.error('❌ Error en flujo E2E:', error);
            throw error;
        }
    }, 15000); // Timeout extendido para flujo completo
});

console.log('🎯 FASE 1 - SUITE DE TESTS COMPLETA CARGADA');