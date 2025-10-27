/**
 * Script para crear usuarios de prueba para testing externo
 *
 * Crea:
 * - 1 Admin de prueba
 * - 2 Agentes de prueba
 *
 * Uso: npm run seed:test-users
 *
 * IMPORTANTE: Solo ejecutar en ambientes de desarrollo/testing
 */

import db from '../models/index.js';
import bcrypt from 'bcrypt';

const { User } = db;

// Usuarios de prueba
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

async function seedTestUsers() {
    try {
        console.log('\n🧪 ========================================');
        console.log('   SEED DE USUARIOS DE PRUEBA - WELCOMEDLY');
        console.log('========================================\n');

        // Validar que no estamos en producción
        if (process.env.NODE_ENV === 'production') {
            console.error('❌ ERROR: Este script NO debe ejecutarse en producción\n');
            process.exit(1);
        }

        console.log('📋 Ambiente: ' + (process.env.NODE_ENV || 'development'));
        console.log('🗄️  Base de datos: ' + process.env.DB_NAME);
        console.log('🔧 Creando ' + testUsers.length + ' usuarios de prueba...\n');

        let created = 0;
        let skipped = 0;

        for (const userData of testUsers) {
            // Verificar si el usuario ya existe
            const existingUser = await User.findOne({
                where: { username: userData.username }
            });

            if (existingUser) {
                console.log(`⏭️  SKIP: ${userData.username} (${userData.rol}) - Ya existe`);
                skipped++;
                continue;
            }

            // Hashear contraseña antes de crear
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(userData.contrasena, salt);

            // Crear usuario
            await User.create({
                ...userData,
                contrasena: hashedPassword
            });

            console.log(`✅ CREADO: ${userData.username} (${userData.rol})`);
            console.log(`   - Nombre: ${userData.primerNombre} ${userData.primerApellido}`);
            console.log(`   - Correo: ${userData.correo}`);
            console.log(`   - Contraseña: Test2025!`);
            console.log('');
            created++;
        }

        console.log('========================================');
        console.log(`📊 RESUMEN:`);
        console.log(`   ✅ Creados: ${created}`);
        console.log(`   ⏭️  Omitidos: ${skipped} (ya existían)`);
        console.log(`   📝 Total: ${testUsers.length}`);
        console.log('========================================\n');

        if (created > 0) {
            console.log('🎉 ¡Usuarios de prueba creados exitosamente!\n');
            console.log('📖 Siguientes pasos:\n');
            console.log('   1. Leer GUIA_TESTING_NGROK.md para exponer tu servidor');
            console.log('   2. Compartir CREDENCIALES_TESTING.md con tu tester');
            console.log('   3. Iniciar servidor: npm run dev');
            console.log('   4. Exponer con ngrok: ngrok http 3000\n');
        } else {
            console.log('ℹ️  Todos los usuarios ya existían. No se creó nada nuevo.\n');
        }

        console.log('🔑 CREDENCIALES DE ACCESO:\n');
        console.log('┌─────────────────────────────────────────┐');
        testUsers.forEach(user => {
            console.log(`│ ${user.rol.padEnd(6)} → ${user.username.padEnd(14)} │ Test2025!`);
        });
        console.log('└─────────────────────────────────────────┘\n');

    } catch (error) {
        console.error('\n❌ ERROR al crear usuarios de prueba:\n');
        console.error(error);
        console.error('\n💡 Posibles causas:');
        console.error('   - Base de datos no está corriendo');
        console.error('   - Variables de entorno incorrectas (.env)');
        console.error('   - Tablas no existen (ejecutar migraciones primero)\n');
        process.exit(1);
    }
}

// Ejecutar el seed
seedTestUsers()
    .then(() => {
        console.log('✅ Proceso completado exitosamente\n');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Error fatal:', error);
        process.exit(1);
    });
