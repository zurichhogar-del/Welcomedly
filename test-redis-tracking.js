/**
 * Script de prueba para validar tracking Redis de métricas de agente
 * Sprint 1.2 - Testing Micro-Sprint
 */

import agentStatusService from './src/services/agentStatusService.js';
import { AgentMetricsCache, AgentStateCache } from './src/database/redisClient.js';

const AGENT_ID = 1; // Admin test user

async function testRedisTracking() {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 INICIANDO PRUEBAS DE TRACKING REDIS - SPRINT 1.2');
    console.log('='.repeat(70) + '\n');

    try {
        // Paso 1: Limpiar estado previo y métricas
        console.log('📝 Paso 1: Limpiando estado previo y métricas del agente...');
        await AgentStateCache.deleteState(AGENT_ID);

        // Eliminar métricas del día actual para empezar desde cero
        const redisKey = `agent:${AGENT_ID}:metrics:today`;
        await import('./src/database/redisClient.js').then(m => m.default.del(redisKey));

        console.log('   ✅ Estado y métricas limpiados\n');

        // Paso 2: Obtener métricas iniciales
        console.log('📊 Paso 2: Obteniendo métricas iniciales...');
        let metrics = await agentStatusService.getCurrentMetrics(AGENT_ID);
        console.log('   Métricas iniciales:', {
            productiveTime: metrics.metrics.productiveTime,
            pauseTime: metrics.metrics.pauseTime,
            callTime: metrics.metrics.callTime,
            calls: metrics.metrics.calls,
            efficiency: metrics.efficiency + '%'
        });
        console.log('   ✅ Métricas obtenidas\n');

        // Paso 3: Simular inicio de sesión (cambia a 'available')
        console.log('🚀 Paso 3: Iniciando sesión de trabajo (estado: available)...');
        await agentStatusService.changeAgentStatus(AGENT_ID, 'available', 'Test: Inicio de sesión');
        console.log('   ✅ Estado cambiado a AVAILABLE\n');

        // Paso 4: Esperar 5 segundos simulando trabajo productivo
        console.log('⏱️  Paso 4: Esperando 5 segundos (tiempo productivo)...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log('   ✅ 5 segundos transcurridos\n');

        // Paso 5: Cambiar a "in_call"
        console.log('📞 Paso 5: Cambiando a estado IN_CALL...');
        await agentStatusService.changeAgentStatus(AGENT_ID, 'in_call', 'Test: Llamada iniciada');

        // Verificar que se incrementó el tiempo productivo
        metrics = await agentStatusService.getCurrentMetrics(AGENT_ID);
        console.log('   Tiempo productivo acumulado:', metrics.metrics.productiveTime, 'segundos');
        console.log('   Número de llamadas:', metrics.metrics.calls);
        console.log('   ✅ Estado cambiado a IN_CALL\n');

        // Paso 6: Esperar 3 segundos en llamada
        console.log('⏱️  Paso 6: Esperando 3 segundos (en llamada)...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('   ✅ 3 segundos transcurridos\n');

        // Paso 7: Cambiar a "on_pause" directamente (pausa de emergencia permitida)
        console.log('⏸️  Paso 7: Cambiando a estado ON_PAUSE (pausa de emergencia)...');
        await agentStatusService.changeAgentStatus(AGENT_ID, 'on_pause', 'Test: Pausa de emergencia');

        metrics = await agentStatusService.getCurrentMetrics(AGENT_ID);
        console.log('   Tiempo productivo total:', metrics.metrics.productiveTime, 'segundos');
        console.log('   Tiempo en llamada:', metrics.metrics.callTime, 'segundos');
        console.log('   ✅ Estado cambiado a ON_PAUSE\n');

        // Paso 8: Esperar 2 segundos en pausa
        console.log('⏱️  Paso 8: Esperando 2 segundos (en pausa)...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('   ✅ 2 segundos transcurridos\n');

        // Paso 9: Volver a available
        console.log('🔄 Paso 9: Volviendo a estado AVAILABLE (fin de pausa)...');
        await agentStatusService.changeAgentStatus(AGENT_ID, 'available', 'Test: Fin de pausa');

        metrics = await agentStatusService.getCurrentMetrics(AGENT_ID);
        console.log('   Tiempo en pausa acumulado:', metrics.metrics.pauseTime, 'segundos');
        console.log('   ✅ Estado cambiado a AVAILABLE\n');

        // Paso 10: Métricas finales
        console.log('📊 Paso 10: MÉTRICAS FINALES');
        console.log('='.repeat(70));
        metrics = await agentStatusService.getCurrentMetrics(AGENT_ID);
        console.log('   📈 Tiempo productivo:', metrics.metrics.productiveTime, 'segundos (esperado: ~8s)');
        console.log('   ⏸️  Tiempo en pausa:', metrics.metrics.pauseTime, 'segundos (esperado: ~2s)');
        console.log('   📞 Tiempo en llamada:', metrics.metrics.callTime, 'segundos (esperado: ~3s)');
        console.log('   📊 Total llamadas:', metrics.metrics.calls, '(esperado: 1)');
        console.log('   💯 Eficiencia:', metrics.efficiency + '%');
        console.log('   🕒 Estado actual:', metrics.currentState?.status || 'null');
        console.log('='.repeat(70) + '\n');

        // Validaciones
        console.log('✅ VALIDACIONES:');
        const validations = [];

        if (metrics.metrics.productiveTime >= 7 && metrics.metrics.productiveTime <= 9) {
            console.log('   ✅ Tiempo productivo correcto (~8s)');
            validations.push(true);
        } else {
            console.log(`   ❌ Tiempo productivo incorrecto: ${metrics.metrics.productiveTime}s (esperado: ~8s)`);
            validations.push(false);
        }

        if (metrics.metrics.pauseTime >= 1 && metrics.metrics.pauseTime <= 3) {
            console.log('   ✅ Tiempo en pausa correcto (~2s)');
            validations.push(true);
        } else {
            console.log(`   ❌ Tiempo en pausa incorrecto: ${metrics.metrics.pauseTime}s (esperado: ~2s)`);
            validations.push(false);
        }

        if (metrics.metrics.callTime >= 2 && metrics.metrics.callTime <= 4) {
            console.log('   ✅ Tiempo en llamada correcto (~3s)');
            validations.push(true);
        } else {
            console.log(`   ❌ Tiempo en llamada incorrecto: ${metrics.metrics.callTime}s (esperado: ~3s)`);
            validations.push(false);
        }

        if (metrics.metrics.calls === 1) {
            console.log('   ✅ Contador de llamadas correcto (1)');
            validations.push(true);
        } else {
            console.log(`   ❌ Contador de llamadas incorrecto: ${metrics.metrics.calls} (esperado: 1)`);
            validations.push(false);
        }

        if (metrics.currentState && metrics.currentState.status === 'available') {
            console.log('   ✅ Estado actual correcto (available)');
            validations.push(true);
        } else {
            console.log(`   ❌ Estado actual incorrecto: ${metrics.currentState?.status || 'null'} (esperado: available)`);
            validations.push(false);
        }

        const allPassed = validations.every(v => v);

        console.log('\n' + '='.repeat(70));
        if (allPassed) {
            console.log('✅ ✅ ✅ TODAS LAS PRUEBAS PASARON ✅ ✅ ✅');
            console.log('🎉 El sistema de tracking Redis está funcionando correctamente');
        } else {
            console.log('❌ ALGUNAS PRUEBAS FALLARON');
            console.log('⚠️  El sistema necesita ajustes');
        }
        console.log('='.repeat(70) + '\n');

        process.exit(allPassed ? 0 : 1);

    } catch (error) {
        console.error('\n❌ ERROR EN LAS PRUEBAS:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Ejecutar pruebas
testRedisTracking();
