/**
 * Telephony System Tests - Sprint 3.1
 * Tests for Call, SipPeer, Trunk models and TelephonyService
 */

import { jest } from '@jest/globals';
import db from '../src/models/index.js';

const { Call, SipPeer, Trunk, User, Campana, sequelize } = db;

describe('Telephony System Tests', () => {
    let testUser;
    let testCampana;
    let testTrunk;
    let testSipPeer;

    beforeAll(async () => {
        // Ensure database is connected
        await sequelize.authenticate();
    });

    beforeEach(async () => {
        // Create test user
        testUser = await User.create({
            primerNombre: 'Test',
            primerApellido: 'Agent',
            identificacion: `TEST-${Date.now()}`,
            correo: `test.agent.${Date.now()}@test.com`,
            username: `testagent${Date.now()}`,
            rol: 'AGENTE',
            contrasena: 'testpassword123',
            estado: true
        });

        // Create test campaign
        testCampana = await Campana.create({
            nombre: `Test Campaign ${Date.now()}`,
            descripcion: 'Test campaign for telephony tests',
            estado: 'ACTIVA',
            fechaInicio: new Date(),
            fechaFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
    });

    afterEach(async () => {
        // Clean up test data
        if (testSipPeer) await testSipPeer.destroy();
        if (testTrunk) await testTrunk.destroy();
        if (testCampana) await testCampana.destroy();
        if (testUser) await testUser.destroy();
    });

    afterAll(async () => {
        await sequelize.close();
    });

    // ==================== TRUNK MODEL TESTS ====================

    describe('Trunk Model', () => {
        test('should create a trunk with valid data', async () => {
            const trunk = await Trunk.create({
                name: 'Test Twilio Trunk',
                description: 'Test trunk for unit tests',
                provider: 'twilio',
                trunkType: 'pjsip',
                host: 'sip.twilio.com',
                port: 5060,
                username: 'test_account_sid',
                password: 'test_auth_token',
                fromUser: '+1234567890',
                maxChannels: 10,
                priority: 1,
                status: 'active'
            });

            expect(trunk.id).toBeDefined();
            expect(trunk.name).toBe('Test Twilio Trunk');
            expect(trunk.provider).toBe('twilio');
            expect(trunk.status).toBe('active');
            expect(trunk.registered).toBe(false);
            expect(trunk.totalCalls).toBe(0);

            await trunk.destroy();
        });

        test('should fail to create trunk with duplicate name', async () => {
            const trunk1 = await Trunk.create({
                name: 'Unique Trunk Name',
                provider: 'vonage',
                host: 'sip.vonage.com',
                port: 5060
            });

            await expect(Trunk.create({
                name: 'Unique Trunk Name', // Duplicate
                provider: 'twilio',
                host: 'sip.twilio.com',
                port: 5060
            })).rejects.toThrow();

            await trunk1.destroy();
        });

        test('should update trunk registration status', async () => {
            const trunk = await Trunk.create({
                name: 'Registration Test Trunk',
                provider: 'custom',
                host: '192.168.1.100',
                port: 5060
            });

            expect(trunk.registered).toBe(false);

            await trunk.updateRegistration(true);
            expect(trunk.registered).toBe(true);
            expect(trunk.lastRegisteredAt).toBeDefined();
            expect(trunk.status).toBe('active');

            await trunk.destroy();
        });

        test('should record call statistics', async () => {
            const trunk = await Trunk.create({
                name: 'Stats Test Trunk',
                provider: 'bandwidth',
                host: 'voice.bandwidth.com',
                port: 5060
            });

            expect(trunk.totalCalls).toBe(0);
            expect(trunk.successfulCalls).toBe(0);
            expect(trunk.failedCalls).toBe(0);

            // Record successful call
            await trunk.recordCall(true);
            expect(trunk.totalCalls).toBe(1);
            expect(trunk.successfulCalls).toBe(1);
            expect(trunk.failedCalls).toBe(0);

            // Record failed call
            await trunk.recordCall(false);
            expect(trunk.totalCalls).toBe(2);
            expect(trunk.successfulCalls).toBe(1);
            expect(trunk.failedCalls).toBe(1);

            await trunk.destroy();
        });

        test('should get available trunks ordered by priority', async () => {
            const trunk1 = await Trunk.create({
                name: 'Priority 1 Trunk',
                provider: 'twilio',
                host: 'sip.twilio.com',
                port: 5060,
                priority: 1,
                status: 'active',
                registered: true
            });

            const trunk2 = await Trunk.create({
                name: 'Priority 2 Trunk',
                provider: 'vonage',
                host: 'sip.vonage.com',
                port: 5060,
                priority: 2,
                status: 'active',
                registered: true
            });

            const trunk3 = await Trunk.create({
                name: 'Inactive Trunk',
                provider: 'bandwidth',
                host: 'voice.bandwidth.com',
                port: 5060,
                priority: 3,
                status: 'inactive',
                registered: false
            });

            const available = await Trunk.getAvailable();

            expect(available.length).toBe(2); // Only active + registered
            expect(available[0].name).toBe('Priority 1 Trunk'); // Ordered by priority
            expect(available[1].name).toBe('Priority 2 Trunk');

            await trunk1.destroy();
            await trunk2.destroy();
            await trunk3.destroy();
        });

        test('should calculate virtual fields correctly', async () => {
            const trunk = await Trunk.create({
                name: 'Virtual Fields Test',
                provider: 'twilio',
                host: 'sip.twilio.com',
                port: 5060,
                status: 'active',
                registered: true,
                totalCalls: 100,
                successfulCalls: 85,
                failedCalls: 15
            });

            expect(trunk.isAvailable).toBe(true);
            expect(trunk.successRate).toBe('85.00');
            expect(trunk.failureRate).toBe('15.00');

            await trunk.destroy();
        });
    });

    // ==================== SIP PEER MODEL TESTS ====================

    describe('SipPeer Model', () => {
        test('should create SIP peer for user', async () => {
            const sipPeer = await SipPeer.createForUser(
                testUser.id,
                testUser.primerNombre,
                testUser.primerApellido
            );

            expect(sipPeer.id).toBeDefined();
            expect(sipPeer.userId).toBe(testUser.id);
            expect(sipPeer.sipUsername).toBeDefined();
            expect(sipPeer.extension).toBeDefined();
            expect(sipPeer.status).toBe('active');
            expect(sipPeer.registered).toBe(false);

            testSipPeer = sipPeer;
        });

        test('should generate unique username and extension', async () => {
            const sipPeer1 = await SipPeer.createForUser(
                testUser.id,
                'John',
                'Doe'
            );

            // Create another user
            const user2 = await User.create({
                primerNombre: 'John',
                primerApellido: 'Doe',
                identificacion: `TEST-${Date.now()}-2`,
                correo: `john.doe.${Date.now()}@test.com`,
                username: `johndoe${Date.now()}`,
                rol: 'AGENTE',
                contrasena: 'testpassword123'
            });

            const sipPeer2 = await SipPeer.createForUser(
                user2.id,
                'John',
                'Doe'
            );

            // Should have different usernames (due to conflict resolution)
            expect(sipPeer1.sipUsername).not.toBe(sipPeer2.sipUsername);
            expect(sipPeer1.extension).not.toBe(sipPeer2.extension);

            await sipPeer1.destroy();
            await sipPeer2.destroy();
            await user2.destroy();
        });

        test('should update registration status', async () => {
            const sipPeer = await SipPeer.createForUser(
                testUser.id,
                testUser.primerNombre,
                testUser.primerApellido
            );

            await sipPeer.updateRegistration(true, '192.168.1.10', 'SIP.js/0.21.0');

            expect(sipPeer.registered).toBe(true);
            expect(sipPeer.ipAddress).toBe('192.168.1.10');
            expect(sipPeer.userAgent).toBe('SIP.js/0.21.0');
            expect(sipPeer.lastRegisteredAt).toBeDefined();

            await sipPeer.destroy();
        });

        test('should get all active SIP peers', async () => {
            const sipPeer1 = await SipPeer.createForUser(testUser.id, 'Test', 'User1');

            const user2 = await User.create({
                primerNombre: 'Test',
                primerApellido: 'User2',
                identificacion: `TEST-${Date.now()}-3`,
                correo: `test.user2.${Date.now()}@test.com`,
                username: `testuser2${Date.now()}`,
                rol: 'AGENTE',
                contrasena: 'testpassword123'
            });

            const sipPeer2 = await SipPeer.createForUser(user2.id, 'Test', 'User2');
            await sipPeer2.deactivate();

            const activePeers = await SipPeer.getActive();
            const activePeerIds = activePeers.map(p => p.id);

            expect(activePeerIds).toContain(sipPeer1.id);
            expect(activePeerIds).not.toContain(sipPeer2.id);

            await sipPeer1.destroy();
            await sipPeer2.destroy();
            await user2.destroy();
        });
    });

    // ==================== CALL MODEL TESTS ====================

    describe('Call Model', () => {
        beforeEach(async () => {
            testTrunk = await Trunk.create({
                name: 'Test Call Trunk',
                provider: 'twilio',
                host: 'sip.twilio.com',
                port: 5060
            });
        });

        test('should create call record', async () => {
            const call = await Call.create({
                callId: `TEST-CALL-${Date.now()}`,
                agentId: testUser.id,
                campaignId: testCampana.id,
                trunkId: testTrunk.id,
                direction: 'outbound',
                callerNumber: '1001',
                calleeNumber: '+1234567890',
                startTime: new Date()
            });

            expect(call.id).toBeDefined();
            expect(call.direction).toBe('outbound');
            expect(call.agentId).toBe(testUser.id);
            expect(call.trunkId).toBe(testTrunk.id);

            await call.destroy();
        });

        test('should calculate call duration', async () => {
            const call = await Call.create({
                callId: `TEST-CALL-${Date.now()}`,
                agentId: testUser.id,
                direction: 'outbound',
                callerNumber: '1001',
                calleeNumber: '+1234567890',
                startTime: new Date('2025-01-01T10:00:00Z'),
                endTime: new Date('2025-01-01T10:05:30Z')
            });

            call.calculateDuration();
            expect(call.duration).toBe(330); // 5 minutes 30 seconds

            await call.destroy();
        });

        test('should calculate billable seconds', async () => {
            const call = await Call.create({
                callId: `TEST-CALL-${Date.now()}`,
                agentId: testUser.id,
                direction: 'outbound',
                callerNumber: '1001',
                calleeNumber: '+1234567890',
                startTime: new Date('2025-01-01T10:00:00Z'),
                answerTime: new Date('2025-01-01T10:00:05Z'),
                endTime: new Date('2025-01-01T10:03:05Z')
            });

            call.calculateBillsec();
            expect(call.billsec).toBe(180); // 3 minutes

            await call.destroy();
        });

        test('should get agent call statistics', async () => {
            // Create multiple calls for agent
            await Call.create({
                callId: `TEST-CALL-1-${Date.now()}`,
                agentId: testUser.id,
                direction: 'outbound',
                startTime: new Date(),
                disposition: 'ANSWERED',
                duration: 120,
                billsec: 100
            });

            await Call.create({
                callId: `TEST-CALL-2-${Date.now()}`,
                agentId: testUser.id,
                direction: 'outbound',
                startTime: new Date(),
                disposition: 'NO ANSWER',
                duration: 30,
                billsec: 0
            });

            await Call.create({
                callId: `TEST-CALL-3-${Date.now()}`,
                agentId: testUser.id,
                direction: 'outbound',
                startTime: new Date(),
                disposition: 'ANSWERED',
                duration: 180,
                billsec: 150
            });

            const stats = await Call.getAgentStats(testUser.id);

            expect(stats.totalCalls).toBe(3);
            expect(stats.answered).toBe(2);
            expect(stats.noAnswer).toBe(1);
            expect(stats.answerRate).toBe('66.67');

            // Clean up
            await Call.destroy({ where: { agentId: testUser.id } });
        });

        test('should format duration as HH:MM:SS', async () => {
            const call = await Call.create({
                callId: `TEST-CALL-${Date.now()}`,
                agentId: testUser.id,
                direction: 'outbound',
                callerNumber: '1001',
                calleeNumber: '+1234567890',
                startTime: new Date(),
                duration: 3665 // 1 hour, 1 minute, 5 seconds
            });

            expect(call.durationFormatted).toBe('01:01:05');

            await call.destroy();
        });
    });

    // ==================== INTEGRATION TESTS ====================

    describe('Telephony Integration Tests', () => {
        test('should link call to trunk and record statistics', async () => {
            const trunk = await Trunk.create({
                name: 'Integration Test Trunk',
                provider: 'twilio',
                host: 'sip.twilio.com',
                port: 5060,
                totalCalls: 0,
                successfulCalls: 0
            });

            const call = await Call.create({
                callId: `TEST-CALL-${Date.now()}`,
                agentId: testUser.id,
                trunkId: trunk.id,
                direction: 'outbound',
                callerNumber: '1001',
                calleeNumber: '+1234567890',
                startTime: new Date(),
                disposition: 'ANSWERED'
            });

            // Simulate recording call stats
            await trunk.recordCall(true);

            await trunk.reload();
            expect(trunk.totalCalls).toBe(1);
            expect(trunk.successfulCalls).toBe(1);

            await call.destroy();
            await trunk.destroy();
        });

        test('should assign multiple trunks to campaign', async () => {
            const trunk1 = await Trunk.create({
                name: 'Campaign Trunk 1',
                provider: 'twilio',
                host: 'sip.twilio.com',
                port: 5060
            });

            const trunk2 = await Trunk.create({
                name: 'Campaign Trunk 2',
                provider: 'vonage',
                host: 'sip.vonage.com',
                port: 5060
            });

            // Associate trunks with campaign (via campaign_trunks junction table)
            await sequelize.query(`
                INSERT INTO campaign_trunks (campana_id, trunk_id, priority, created_at, updated_at)
                VALUES (${testCampana.id}, ${trunk1.id}, 1, NOW(), NOW()),
                       (${testCampana.id}, ${trunk2.id}, 2, NOW(), NOW())
            `);

            const [results] = await sequelize.query(`
                SELECT * FROM campaign_trunks WHERE campana_id = ${testCampana.id}
            `);

            expect(results.length).toBe(2);

            // Clean up
            await sequelize.query(`DELETE FROM campaign_trunks WHERE campana_id = ${testCampana.id}`);
            await trunk1.destroy();
            await trunk2.destroy();
        });
    });
});
