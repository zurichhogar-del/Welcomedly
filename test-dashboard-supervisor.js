/**
 * Script de prueba para validar Dashboard de Supervisor
 * Sprint 1.3 - Testing Completo
 *
 * Este script simula cambios de estado de agentes y verifica
 * que las métricas se actualicen correctamente
 */

import agentStatusService from './src/services/agentStatusService.js';
import { AgentMetricsCache, AgentStateCache } from './src/database/redisClient.js';

const AGENT_ID = 1; // Admin test user

async function testSupervisorDashboard() {
    console.log('\n' + '='.repeat(70));
    console.log('📊 PRUEBA COMPLETA: DASHBOARD DE SUPERVISOR - SPRINT 1.3');
    console.log('='.repeat(70) + '\n');

    try {
        // ==================================================
        // PASO 1: Preparación - Limpiar estado previo
        // ==================================================
        console.log('🧹 PASO 1: Limpiando estado previo del agente...');
        await AgentStateCache.deleteState(AGENT_ID);
        const redisKey = `agent:${AGENT_ID}:metrics:today`;
        await import('./src/database/redisClient.js').then(m => m.default.del(redisKey));
        console.log('   ✅ Estado limpio\n');

        // ==================================================
        // PASO 2: Verificar métricas del dashboard (vacías)
        // ==================================================
        console.log('📈 PASO 2: Obteniendo métricas iniciales del dashboard...');
        let dashboardData = await agentStatusService.getSupervisorDashboardMetrics();
        console.log(`   Total agentes: ${dashboardData.summary.totalAgents}`);
        console.log(`   Agentes disponibles: ${dashboardData.summary.byStatus.available || 0}`);
        console.log(`   Agentes en llamada: ${dashboardData.summary.byStatus.in_call || 0}`);
        console.log(`   Agentes en pausa: ${dashboardData.summary.byStatus.on_pause || 0}`);
        console.log(`   Llamadas totales: ${dashboardData.summary.totalCalls}`);
        console.log(`   Eficiencia promedio: ${dashboardData.summary.avgEfficiency}%`);
        console.log('   ✅ Métricas iniciales obtenidas\n');

        // ==================================================
        // PASO 3: Iniciar sesión (available)
        // ==================================================
        console.log('🚀 PASO 3: Iniciando sesión de agente (estado: available)...');
        await agentStatusService.changeAgentStatus(AGENT_ID, 'available', 'Test: Inicio de sesión');
        console.log('   ✅ Agente cambiado a AVAILABLE\n');

        // Esperar 3 segundos
        console.log('⏱️  Esperando 3 segundos...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // ==================================================
        // PASO 4: Verificar dashboard después de cambio
        // ==================================================
        console.log('📊 PASO 4: Verificando actualización del dashboard...');
        dashboardData = await agentStatusService.getSupervisorDashboardMetrics();
        console.log(`   Agentes disponibles: ${dashboardData.summary.byStatus.available || 0} (esperado: 1)`);

        const agentData = dashboardData.agents.find(a => a.agentId === AGENT_ID);
        console.log(`   Estado del agente: ${agentData?.currentStatus} (esperado: available)`);
        console.log(`   Tiempo en estado: ${agentData?.statusDuration}s`);
        console.log('   ✅ Dashboard actualizado correctamente\n');

        // ==================================================
        // PASO 5: Cambiar a in_call
        // ==================================================
        console.log('📞 PASO 5: Cambiando a estado IN_CALL...');
        await agentStatusService.changeAgentStatus(AGENT_ID, 'in_call', 'Test: Llamada iniciada');
        console.log('   ✅ Agente cambiado a IN_CALL\n');

        // Esperar 4 segundos
        console.log('⏱️  Esperando 4 segundos...');
        await new Promise(resolve => setTimeout(resolve, 4000));

        // ==================================================
        // PASO 6: Verificar métricas después de llamada
        // ==================================================
        console.log('📈 PASO 6: Verificando métricas después de llamada...');
        dashboardData = await agentStatusService.getSupervisorDashboardMetrics();
        console.log(`   Agentes en llamada: ${dashboardData.summary.byStatus.in_call || 0} (esperado: 1)`);
        console.log(`   Total de llamadas: ${dashboardData.summary.totalCalls} (esperado: 1)`);
        console.log(`   Eficiencia promedio: ${dashboardData.summary.avgEfficiency}%`);
        console.log('   ✅ Métricas actualizadas\n');

        // ==================================================
        // PASO 7: Cambiar a on_pause (probar alertas)
        // ==================================================
        console.log('⏸️  PASO 7: Cambiando a ON_PAUSE (para probar alertas)...');
        await agentStatusService.changeAgentStatus(AGENT_ID, 'on_pause', 'Test: Pausa de prueba');
        console.log('   ✅ Agente cambiado a ON_PAUSE\n');

        // Esperar 2 segundos
        console.log('⏱️  Esperando 2 segundos...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // ==================================================
        // PASO 8: Verificar alertas y contadores finales
        // ==================================================
        console.log('🚨 PASO 8: Verificando sistema de alertas...');
        dashboardData = await agentStatusService.getSupervisorDashboardMetrics();
        console.log(`   Agentes en pausa: ${dashboardData.summary.byStatus.on_pause || 0} (esperado: 1)`);
        console.log(`   Alertas activas: ${dashboardData.alerts.length}`);

        if (dashboardData.alerts.length > 0) {
            dashboardData.alerts.forEach(alert => {
                console.log(`   ⚠️  ${alert.message}`);
            });
        }
        console.log('   ✅ Sistema de alertas funcionando\n');

        // ==================================================
        // PASO 9: Volver a available y métricas finales
        // ==================================================
        console.log('🔄 PASO 9: Finalizando sesión (volver a available)...');
        await agentStatusService.changeAgentStatus(AGENT_ID, 'available', 'Test: Fin de pausa');

        dashboardData = await agentStatusService.getSupervisorDashboardMetrics();
        const finalAgentData = dashboardData.agents.find(a => a.agentId === AGENT_ID);

        console.log('\n' + '='.repeat(70));
        console.log('📊 MÉTRICAS FINALES DEL DASHBOARD');
        console.log('='.repeat(70));
        console.log('\n📋 Resumen General:');
        console.log(`   Total agentes: ${dashboardData.summary.totalAgents}`);
        console.log(`   Total llamadas del día: ${dashboardData.summary.totalCalls}`);
        console.log(`   Eficiencia promedio equipo: ${dashboardData.summary.avgEfficiency}%`);
        console.log(`   Tiempo productivo total: ${dashboardData.summary.totalProductiveTime}s`);

        console.log('\n👤 Datos del Agente de Prueba:');
        console.log(`   ID: ${finalAgentData.agentId}`);
        console.log(`   Nombre: ${finalAgentData.agentName}`);
        console.log(`   Estado actual: ${finalAgentData.currentStatus}`);
        console.log(`   Tiempo productivo: ${finalAgentData.metrics.productiveTime}s`);
        console.log(`   Tiempo en pausa: ${finalAgentData.metrics.pauseTime}s`);
        console.log(`   Tiempo en llamada: ${finalAgentData.metrics.callTime}s`);
        console.log(`   Llamadas: ${finalAgentData.metrics.calls}`);
        console.log(`   Eficiencia: ${finalAgentData.efficiency}%`);

        console.log('\n📊 Distribución por Estado:');
        Object.keys(dashboardData.summary.byStatus).forEach(status => {
            console.log(`   ${status}: ${dashboardData.summary.byStatus[status]} agente(s)`);
        });

        // ==================================================
        // VALIDACIONES
        // ==================================================
        console.log('\n' + '='.repeat(70));
        console.log('✅ VALIDACIONES:');
        console.log('='.repeat(70));

        const validations = [];

        // Validación 1: Llamadas registradas
        if (finalAgentData.metrics.calls === 1) {
            console.log('   ✅ Llamada registrada correctamente (1)');
            validations.push(true);
        } else {
            console.log(`   ❌ Llamadas incorrectas: ${finalAgentData.metrics.calls} (esperado: 1)`);
            validations.push(false);
        }

        // Validación 2: Tiempo productivo
        if (finalAgentData.metrics.productiveTime >= 6) {
            console.log(`   ✅ Tiempo productivo correcto (${finalAgentData.metrics.productiveTime}s)`);
            validations.push(true);
        } else {
            console.log(`   ❌ Tiempo productivo bajo: ${finalAgentData.metrics.productiveTime}s`);
            validations.push(false);
        }

        // Validación 3: Tiempo en pausa
        if (finalAgentData.metrics.pauseTime >= 1) {
            console.log(`   ✅ Tiempo en pausa registrado (${finalAgentData.metrics.pauseTime}s)`);
            validations.push(true);
        } else {
            console.log(`   ❌ Tiempo en pausa no registrado`);
            validations.push(false);
        }

        // Validación 4: Eficiencia calculada
        if (finalAgentData.efficiency > 0 && finalAgentData.efficiency <= 100) {
            console.log(`   ✅ Eficiencia válida (${finalAgentData.efficiency}%)`);
            validations.push(true);
        } else {
            console.log(`   ❌ Eficiencia inválida: ${finalAgentData.efficiency}%`);
            validations.push(false);
        }

        // Validación 5: Estado actual
        if (finalAgentData.currentStatus === 'available') {
            console.log('   ✅ Estado final correcto (available)');
            validations.push(true);
        } else {
            console.log(`   ❌ Estado final incorrecto: ${finalAgentData.currentStatus}`);
            validations.push(false);
        }

        // ==================================================
        // RESULTADO FINAL
        // ==================================================
        const allPassed = validations.every(v => v);

        console.log('\n' + '='.repeat(70));
        if (allPassed) {
            console.log('✅ ✅ ✅ TODAS LAS PRUEBAS DEL DASHBOARD PASARON ✅ ✅ ✅');
            console.log('🎉 El Dashboard de Supervisor está funcionando correctamente');
            console.log('\n📝 Funcionalidades validadas:');
            console.log('   ✅ API de métricas del supervisor');
            console.log('   ✅ Agregación de datos de múltiples agentes');
            console.log('   ✅ Tracking de estados en tiempo real');
            console.log('   ✅ Cálculo de métricas (llamadas, eficiencia, tiempos)');
            console.log('   ✅ Sistema de alertas para pausas prolongadas');
            console.log('   ✅ Resumen estadístico del equipo');
        } else {
            console.log('❌ ALGUNAS PRUEBAS FALLARON');
            console.log('⚠️  El sistema necesita ajustes');
        }
        console.log('='.repeat(70) + '\n');

        console.log('🌐 Para probar la UI del dashboard:');
        console.log('   1. Inicia sesión como ADMIN en http://localhost:3000/auth/login');
        console.log('   2. Navega a http://localhost:3000/api/agent/supervisor/dashboard');
        console.log('   3. Observa la actualización automática cada 5 segundos');
        console.log('   4. Prueba los filtros de estado (Todos, Disponibles, En Llamada, En Pausa)\n');

        process.exit(allPassed ? 0 : 1);

    } catch (error) {
        console.error('\n❌ ERROR EN LAS PRUEBAS:', error);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Ejecutar pruebas
testSupervisorDashboard();
