import db from '../src/database/connection.js';

async function createTables() {
    try {
        await db.sequelize.sync({ alter: true });
        console.log('✅ Tablas creadas exitosamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creando tablas:', error);
        process.exit(1);
    }
}

createTables();