import db from '../../models/index.js';

/**
 * Crea las tablas de analytics (agent_metrics y campaign_metrics)
 * Sprint 3.3: Reportes y Analytics
 */
async function createAnalyticsTables() {
    try {
        console.log('[Migration] Creating analytics tables...');

        // Sincronizar modelos con la base de datos
        // force: false significa que NO eliminará las tablas existentes
        await db.AgentMetric.sync({ force: false });
        console.log('✓ AgentMetric table created/verified');

        await db.CampaignMetric.sync({ force: false });
        console.log('✓ CampaignMetric table created/verified');

        console.log('[Migration] Analytics tables created successfully!');
        process.exit(0);
    } catch (error) {
        console.error('[Migration] Error creating analytics tables:', error);
        process.exit(1);
    }
}

// Ejecutar migración
createAnalyticsTables();
