/**
 * Script para crear datos de prueba para validar FASE 4
 */
import db from '../models/index.js';

const { Formulario, Campana, BaseCampana } = db;

async function seedTestData() {
    try {
        console.log('🌱 Iniciando seed de datos de prueba...\n');

        // 1. Crear formulario de prueba
        console.log('📝 Creando formulario...');
        const formulario = await Formulario.create({
            nombre: 'Formulario Ventas Test',
            campos: ['Interesado', 'No Interesado', 'Más Información']
        });
        console.log(`✅ Formulario creado: ${formulario.nombre} (ID: ${formulario.id})\n`);

        // 2. Crear campaña de prueba
        console.log('📢 Creando campaña...');
        const campana = await Campana.create({
            nombre: 'Campaña Test FASE 4',
            formularioId: formulario.id,
            guion: 'Buenos días, le llamamos de Welcomedly para ofrecerle nuestros servicios...',
            estado: true,
            baseDatos: '/uploads/test_base.csv',
            agentesAsignados: [1] // Usuario admintest
        });
        console.log(`✅ Campaña creada: ${campana.nombre} (ID: ${campana.id})\n`);

        // 3. Crear registros de prueba para la campaña
        console.log('👥 Creando registros de prueba...');
        const registros = [
            {
                nombre: 'Juan Pérez',
                telefono: '3001234567',
                correo: 'juan.perez@test.com',
                otrosCampos: { empresa: 'Tech Solutions', cargo: 'Gerente' },
                campanaId: campana.id
            },
            {
                nombre: 'María González',
                telefono: '3009876543',
                correo: 'maria.gonzalez@test.com',
                otrosCampos: { empresa: 'Marketing Plus', cargo: 'Director' },
                campanaId: campana.id
            },
            {
                nombre: 'Carlos Rodríguez',
                telefono: '3005551234',
                correo: 'carlos.rodriguez@test.com',
                otrosCampos: { empresa: 'Innovate SA', cargo: 'CEO' },
                campanaId: campana.id
            },
            {
                nombre: 'Ana Martínez',
                telefono: '3007778888',
                correo: 'ana.martinez@test.com',
                otrosCampos: { empresa: 'Digital World', cargo: 'Manager' },
                campanaId: campana.id
            },
            {
                nombre: 'Luis Fernández',
                telefono: '3002223344',
                correo: 'luis.fernandez@test.com',
                otrosCampos: { empresa: 'Global Corp', cargo: 'Supervisor' },
                campanaId: campana.id
            }
        ];

        for (const registro of registros) {
            await BaseCampana.create(registro);
            console.log(`  ✓ ${registro.nombre}`);
        }
        console.log(`✅ ${registros.length} registros creados\n`);

        // 4. Simular gestión en algunos registros
        console.log('🔄 Simulando gestiones previas...');

        // Registro 1: Con disposición exitosa
        await BaseCampana.update({
            disposicionId: 1, // Venta cerrada
            agenteId: 1,
            intentosLlamada: 1,
            ultimaLlamada: new Date()
        }, { where: { id: 1 } });
        console.log('  ✓ Registro 1: Venta cerrada');

        // Registro 2: Con callback agendado
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);

        await BaseCampana.update({
            disposicionId: 8, // Volver a llamar
            agenteId: 1,
            callbackDate: tomorrow,
            callbackNotas: 'Cliente solicita llamar mañana a las 10 AM',
            intentosLlamada: 1,
            ultimaLlamada: new Date()
        }, { where: { id: 2 } });
        console.log('  ✓ Registro 2: Callback agendado');

        // Registro 3: Sin contestar (múltiples intentos)
        await BaseCampana.update({
            disposicionId: 3, // No contesta
            agenteId: 1,
            intentosLlamada: 3,
            ultimaLlamada: new Date()
        }, { where: { id: 3 } });
        console.log('  ✓ Registro 3: No contesta (3 intentos)');

        // Registros 4 y 5 quedan sin gestionar

        console.log('\n✅ Gestiones simuladas');

        console.log('\n📊 Resumen de datos creados:');
        console.log('   📝 Formularios: 1');
        console.log('   📢 Campañas: 1');
        console.log('   👥 Registros: 5');
        console.log('   🏷️  Gestiones: 3');
        console.log('\n🎉 Seed de datos de prueba completado!\n');

        console.log('🔗 URLs para probar:');
        console.log(`   - Lista de campañas: http://localhost:3000/campaign/campanas`);
        console.log(`   - Base de campaña: http://localhost:3000/campaign/campanas/${campana.id}/ver-base`);
        console.log(`   - Disposiciones: http://localhost:3000/disposiciones/lista`);
        console.log('\n💡 Usuario de prueba: admintest / admin123\n');

    } catch (error) {
        console.error('❌ Error en seed:', error);
        throw error;
    }
}

// Ejecutar
seedTestData()
    .then(() => {
        console.log('✅ Proceso completado');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Error fatal:', error);
        process.exit(1);
    });
