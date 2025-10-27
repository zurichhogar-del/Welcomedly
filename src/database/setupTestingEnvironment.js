/**
 * Script de Setup Completo para Testing
 *
 * Crea un ambiente completo de testing con:
 * - Usuarios de prueba (admin + agentes)
 * - Formularios de ejemplo
 * - Campañas de ejemplo
 * - Registros de contactos
 * - Disposiciones básicas
 *
 * Uso: npm run setup:testing
 */

import db from '../models/index.js';
import bcrypt from 'bcrypt';

const { User, Formulario, Campana, BaseCampana, Disposicion } = db;

// Datos de usuarios
const testUsers = [
    {
        primerNombre: 'Admin',
        segundoNombre: 'Test',
        primerApellido: 'Welcomedly',
        segundoApellido: 'QA',
        identificacion: '1000000001',
        correo: 'admin.test@welcomedly.com',
        username: 'admin.test',
        contrasena: 'Test2025!',
        rol: 'ADMIN',
        estado: true
    },
    {
        primerNombre: 'Agente',
        segundoNombre: 'Test',
        primerApellido: 'Uno',
        segundoApellido: 'QA',
        identificacion: '1000000002',
        correo: 'agente.test1@welcomedly.com',
        username: 'agente.test1',
        contrasena: 'Test2025!',
        rol: 'AGENTE',
        estado: true
    },
    {
        primerNombre: 'Agente',
        segundoNombre: 'Test',
        primerApellido: 'Dos',
        segundoApellido: 'QA',
        identificacion: '1000000003',
        correo: 'agente.test2@welcomedly.com',
        username: 'agente.test2',
        contrasena: 'Test2025!',
        rol: 'AGENTE',
        estado: true
    }
];

// Disposiciones básicas
const disposiciones = [
    { nombre: 'Venta Cerrada', descripcion: 'Contacto exitoso con venta' },
    { nombre: 'Interesado', descripcion: 'Cliente muestra interés, seguimiento posterior' },
    { nombre: 'No Interesado', descripcion: 'Cliente rechaza oferta' },
    { nombre: 'Volver a Llamar', descripcion: 'Agendamiento de callback' },
    { nombre: 'No Contesta', descripcion: 'Llamada sin respuesta' },
    { nombre: 'Número Equivocado', descripcion: 'Contacto incorrecto' },
    { nombre: 'Buzón de Voz', descripcion: 'Llamada redirigida a buzón' },
    { nombre: 'Ocupado', descripcion: 'Línea ocupada' }
];

async function setupTestingEnvironment() {
    try {
        console.log('\n🧪 ========================================');
        console.log('   SETUP COMPLETO - AMBIENTE DE TESTING');
        console.log('========================================\n');

        // Validar ambiente
        if (process.env.NODE_ENV === 'production') {
            console.error('❌ ERROR: Este script NO debe ejecutarse en producción\n');
            process.exit(1);
        }

        console.log('📋 Ambiente: ' + (process.env.NODE_ENV || 'development'));
        console.log('🗄️  Base de datos: ' + process.env.DB_NAME + '\n');

        // ========================
        // 1. CREAR USUARIOS
        // ========================
        console.log('👤 PASO 1/5: Creando usuarios de prueba...\n');

        let usersCreated = 0;
        let adminUserId = null;
        let agenteUserIds = [];

        for (const userData of testUsers) {
            const existingUser = await User.findOne({
                where: { username: userData.username }
            });

            if (existingUser) {
                console.log(`   ⏭️  ${userData.username} ya existe (ID: ${existingUser.id})`);
                if (userData.rol === 'ADMIN') {
                    adminUserId = existingUser.id;
                } else {
                    agenteUserIds.push(existingUser.id);
                }
                continue;
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(userData.contrasena, salt);

            const newUser = await User.create({
                ...userData,
                contrasena: hashedPassword
            });

            console.log(`   ✅ ${userData.username} (${userData.rol}) - ID: ${newUser.id}`);
            usersCreated++;

            if (userData.rol === 'ADMIN') {
                adminUserId = newUser.id;
            } else {
                agenteUserIds.push(newUser.id);
            }
        }

        console.log(`\n   📊 Usuarios: ${usersCreated} creados\n`);

        // ========================
        // 2. CREAR DISPOSICIONES
        // ========================
        console.log('🏷️  PASO 2/5: Creando disposiciones...\n');

        let disposicionesCreadas = 0;

        for (const disp of disposiciones) {
            const existing = await Disposicion.findOne({
                where: { nombre: disp.nombre }
            });

            if (existing) {
                console.log(`   ⏭️  ${disp.nombre} ya existe`);
                continue;
            }

            await Disposicion.create(disp);
            console.log(`   ✅ ${disp.nombre}`);
            disposicionesCreadas++;
        }

        console.log(`\n   📊 Disposiciones: ${disposicionesCreadas} creadas\n`);

        // ========================
        // 3. CREAR FORMULARIO
        // ========================
        console.log('📝 PASO 3/5: Creando formulario de ejemplo...\n');

        const formularioExistente = await Formulario.findOne({
            where: { nombre: 'Formulario Testing' }
        });

        let formulario;
        if (formularioExistente) {
            console.log(`   ⏭️  Formulario ya existe (ID: ${formularioExistente.id})\n`);
            formulario = formularioExistente;
        } else {
            formulario = await Formulario.create({
                nombre: 'Formulario Testing',
                campos: [
                    'Venta Cerrada',
                    'Interesado',
                    'No Interesado',
                    'Volver a Llamar',
                    'No Contesta'
                ]
            });
            console.log(`   ✅ Formulario creado (ID: ${formulario.id})\n`);
        }

        // ========================
        // 4. CREAR CAMPAÑA
        // ========================
        console.log('📢 PASO 4/5: Creando campaña de ejemplo...\n');

        const campanaExistente = await Campana.findOne({
            where: { nombre: 'Campaña Testing 2025' }
        });

        let campana;
        if (campanaExistente) {
            console.log(`   ⏭️  Campaña ya existe (ID: ${campanaExistente.id})\n`);
            campana = campanaExistente;
        } else {
            campana = await Campana.create({
                nombre: 'Campaña Testing 2025',
                formularioId: formulario.id,
                guion: 'Buenos días, le llamamos de Welcomedly para presentarle nuestra plataforma de gestión de call center. ¿Sería un buen momento para conversar sobre cómo podemos ayudarle a optimizar sus operaciones?',
                estado: true,
                baseDatos: '/uploads/testing_base.csv',
                agentesAsignados: agenteUserIds
            });
            console.log(`   ✅ Campaña creada (ID: ${campana.id})`);
            console.log(`   📎 Agentes asignados: ${agenteUserIds.length}`);
            console.log('');
        }

        // ========================
        // 5. CREAR REGISTROS
        // ========================
        console.log('👥 PASO 5/5: Creando registros de contactos...\n');

        const registrosExistentes = await BaseCampana.count({
            where: { campanaId: campana.id }
        });

        if (registrosExistentes > 0) {
            console.log(`   ⏭️  Ya existen ${registrosExistentes} registros en esta campaña\n`);
        } else {
            const contactos = [
                {
                    nombre: 'Juan Pérez González',
                    telefono: '3001234567',
                    correo: 'juan.perez@techsolutions.com',
                    otrosCampos: { empresa: 'Tech Solutions SAS', cargo: 'Gerente General', sector: 'Tecnología' },
                    campanaId: campana.id
                },
                {
                    nombre: 'María González Castro',
                    telefono: '3009876543',
                    correo: 'maria.gonzalez@marketingplus.com',
                    otrosCampos: { empresa: 'Marketing Plus', cargo: 'Directora Comercial', sector: 'Marketing' },
                    campanaId: campana.id
                },
                {
                    nombre: 'Carlos Rodríguez López',
                    telefono: '3005551234',
                    correo: 'carlos.rodriguez@innovatesa.com',
                    otrosCampos: { empresa: 'Innovate SA', cargo: 'CEO', sector: 'Innovación' },
                    campanaId: campana.id
                },
                {
                    nombre: 'Ana Martínez Silva',
                    telefono: '3007778888',
                    correo: 'ana.martinez@digitalworld.com',
                    otrosCampos: { empresa: 'Digital World', cargo: 'Product Manager', sector: 'Digital' },
                    campanaId: campana.id
                },
                {
                    nombre: 'Luis Fernández Torres',
                    telefono: '3002223344',
                    correo: 'luis.fernandez@globalcorp.com',
                    otrosCampos: { empresa: 'Global Corp', cargo: 'Supervisor Operaciones', sector: 'Corporativo' },
                    campanaId: campana.id
                },
                {
                    nombre: 'Patricia Ramírez Díaz',
                    telefono: '3006665555',
                    correo: 'patricia.ramirez@callcenterpro.com',
                    otrosCampos: { empresa: 'Call Center Pro', cargo: 'Gerente de Servicio', sector: 'BPO' },
                    campanaId: campana.id
                },
                {
                    nombre: 'Roberto Sánchez Mora',
                    telefono: '3004447777',
                    correo: 'roberto.sanchez@ventas360.com',
                    otrosCampos: { empresa: 'Ventas 360', cargo: 'Director Ventas', sector: 'Ventas' },
                    campanaId: campana.id
                }
            ];

            for (const contacto of contactos) {
                await BaseCampana.create(contacto);
                console.log(`   ✅ ${contacto.nombre} (${contacto.empresa})`);
            }

            console.log(`\n   📊 Contactos: ${contactos.length} creados\n`);
        }

        // ========================
        // RESUMEN FINAL
        // ========================
        console.log('========================================');
        console.log('📊 RESUMEN DEL SETUP:\n');
        console.log(`   👤 Usuarios:       ${usersCreated > 0 ? usersCreated + ' creados' : 'Ya existían'}`);
        console.log(`   🏷️  Disposiciones:  ${disposicionesCreadas > 0 ? disposicionesCreadas + ' creadas' : 'Ya existían'}`);
        console.log(`   📝 Formularios:    ${formularioExistente ? 'Ya existía' : '1 creado'}`);
        console.log(`   📢 Campañas:       ${campanaExistente ? 'Ya existía' : '1 creada'}`);
        console.log(`   👥 Contactos:      ${registrosExistentes > 0 ? registrosExistentes + ' ya existían' : '7 creados'}`);
        console.log('========================================\n');

        console.log('🎉 ¡Setup completado exitosamente!\n');
        console.log('🔗 URLs para probar:\n');
        console.log(`   🏠 Inicio:         http://localhost:3000`);
        console.log(`   🔐 Login:          http://localhost:3000/auth/login`);
        console.log(`   📢 Campañas:       http://localhost:3000/campaign/campanas`);
        console.log(`   📋 Formularios:    http://localhost:3000/market/formularios`);
        console.log(`   👥 Agentes:        http://localhost:3000/agents/lista-agentes`);
        console.log(`   🏷️  Disposiciones:  http://localhost:3000/disposiciones/lista\n`);

        console.log('🔑 CREDENCIALES:\n');
        console.log('┌─────────────────────────────────────────────────┐');
        console.log('│ ROL    │ USUARIO         │ CONTRASEÑA          │');
        console.log('├─────────────────────────────────────────────────┤');
        console.log('│ ADMIN  │ admin.test      │ Test2025!           │');
        console.log('│ AGENTE │ agente.test1    │ Test2025!           │');
        console.log('│ AGENTE │ agente.test2    │ Test2025!           │');
        console.log('└─────────────────────────────────────────────────┘\n');

        console.log('📖 Siguientes pasos:\n');
        console.log('   1. Iniciar servidor: npm run dev');
        console.log('   2. Abrir navegador: http://localhost:3000');
        console.log('   3. Login con admin.test / Test2025!');
        console.log('   4. Explorar campañas y funcionalidades\n');

        console.log('💡 Para compartir con tester externo:');
        console.log('   1. Leer GUIA_TESTING_NGROK.md');
        console.log('   2. Ejecutar: ngrok http 3000');
        console.log('   3. Compartir URL + CREDENCIALES_TESTING.md\n');

    } catch (error) {
        console.error('\n❌ ERROR en setup:\n');
        console.error(error);
        console.error('\n💡 Posibles causas:');
        console.error('   - Base de datos no está corriendo');
        console.error('   - Redis no está disponible');
        console.error('   - Variables de entorno incorrectas');
        console.error('   - Modelos de Sequelize no sincronizados\n');
        process.exit(1);
    }
}

// Ejecutar el setup
setupTestingEnvironment()
    .then(() => {
        console.log('✅ Proceso completado\n');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Error fatal:', error);
        process.exit(1);
    });
