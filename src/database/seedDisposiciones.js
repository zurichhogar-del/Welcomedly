/**
 * Seed de Disposiciones - Códigos de cierre de llamada comunes
 * Se ejecuta manualmente para crear las disposiciones iniciales del sistema
 *
 * Uso: node src/database/seedDisposiciones.js
 */

import db from '../models/index.js';

const { Disposicion } = db;

// Disposiciones iniciales del sistema
const disposicionesIniciales = [
    // EXITOSA - Resultados positivos
    {
        nombre: 'Venta cerrada',
        descripcion: 'Cliente aceptó la oferta y completó la venta',
        color: '#28a745', // Verde
        tipo: 'EXITOSA',
        requiereCallback: false,
        activa: true,
        orden: 1
    },
    {
        nombre: 'Objetivo logrado',
        descripcion: 'Se cumplió el objetivo de la llamada exitosamente',
        color: '#28a745', // Verde
        tipo: 'EXITOSA',
        requiereCallback: false,
        activa: true,
        orden: 2
    },

    // NO_CONTACTO - No se pudo establecer contacto
    {
        nombre: 'No contesta',
        descripcion: 'El número no fue contestado',
        color: '#ffc107', // Amarillo
        tipo: 'NO_CONTACTO',
        requiereCallback: false,
        activa: true,
        orden: 3
    },
    {
        nombre: 'Ocupado',
        descripcion: 'La línea estaba ocupada',
        color: '#ffc107', // Amarillo
        tipo: 'NO_CONTACTO',
        requiereCallback: false,
        activa: true,
        orden: 4
    },
    {
        nombre: 'Número equivocado',
        descripcion: 'El número no corresponde al contacto buscado',
        color: '#6c757d', // Gris
        tipo: 'NO_CONTACTO',
        requiereCallback: false,
        activa: true,
        orden: 5
    },
    {
        nombre: 'Fuera de servicio',
        descripcion: 'El número no existe o está fuera de servicio',
        color: '#6c757d', // Gris
        tipo: 'NO_CONTACTO',
        requiereCallback: false,
        activa: true,
        orden: 6
    },
    {
        nombre: 'Buzón de voz',
        descripcion: 'La llamada fue enviada al buzón de voz',
        color: '#17a2b8', // Azul claro
        tipo: 'NO_CONTACTO',
        requiereCallback: false,
        activa: true,
        orden: 7
    },

    // SEGUIMIENTO - Requieren seguimiento
    {
        nombre: 'Volver a llamar',
        descripcion: 'El cliente solicitó ser contactado nuevamente',
        color: '#007bff', // Azul
        tipo: 'SEGUIMIENTO',
        requiereCallback: true,
        activa: true,
        orden: 8
    },
    {
        nombre: 'Enviar información',
        descripcion: 'Cliente interesado, solicita más información',
        color: '#007bff', // Azul
        tipo: 'SEGUIMIENTO',
        requiereCallback: true,
        activa: true,
        orden: 9
    },
    {
        nombre: 'Solicita presupuesto',
        descripcion: 'Cliente interesado en recibir presupuesto',
        color: '#007bff', // Azul
        tipo: 'SEGUIMIENTO',
        requiereCallback: true,
        activa: true,
        orden: 10
    },
    {
        nombre: 'En proceso de decisión',
        descripcion: 'Cliente está evaluando la propuesta',
        color: '#17a2b8', // Azul claro
        tipo: 'SEGUIMIENTO',
        requiereCallback: true,
        activa: true,
        orden: 11
    },

    // NO_EXITOSA - Resultados negativos definitivos
    {
        nombre: 'No interesado',
        descripcion: 'Cliente no está interesado en la oferta',
        color: '#dc3545', // Rojo
        tipo: 'NO_EXITOSA',
        requiereCallback: false,
        activa: true,
        orden: 12
    },
    {
        nombre: 'No califica',
        descripcion: 'El contacto no cumple con los criterios requeridos',
        color: '#dc3545', // Rojo
        tipo: 'NO_EXITOSA',
        requiereCallback: false,
        activa: true,
        orden: 13
    },
    {
        nombre: 'Ya tiene el servicio',
        descripcion: 'El cliente ya cuenta con el producto/servicio',
        color: '#6c757d', // Gris
        tipo: 'NO_EXITOSA',
        requiereCallback: false,
        activa: true,
        orden: 14
    },
    {
        nombre: 'Solicitó no ser contactado',
        descripcion: 'Cliente pidió ser removido de la base de datos',
        color: '#dc3545', // Rojo
        tipo: 'NO_EXITOSA',
        requiereCallback: false,
        activa: true,
        orden: 15
    }
];

/**
 * Ejecutar el seed
 */
async function seedDisposiciones() {
    try {
        console.log('🌱 Iniciando seed de disposiciones...\n');

        // Sincronizar tablas (crear si no existen)
        await db.sequelize.sync();
        console.log('✅ Base de datos sincronizada\n');

        // Verificar si ya existen disposiciones
        const count = await Disposicion.count();

        if (count > 0) {
            console.log(`⚠️  Ya existen ${count} disposiciones en la base de datos.`);
            console.log('¿Deseas continuar de todas formas? Las disposiciones duplicadas serán omitidas.\n');
        }

        // Insertar disposiciones
        let creadas = 0;
        let omitidas = 0;

        for (const disposicionData of disposicionesIniciales) {
            try {
                // Verificar si ya existe
                const existente = await Disposicion.findOne({
                    where: { nombre: disposicionData.nombre }
                });

                if (existente) {
                    console.log(`⏭️  Omitiendo: "${disposicionData.nombre}" (ya existe)`);
                    omitidas++;
                } else {
                    await Disposicion.create(disposicionData);
                    console.log(`✅ Creada: "${disposicionData.nombre}" [${disposicionData.tipo}]`);
                    creadas++;
                }
            } catch (error) {
                console.error(`❌ Error al crear "${disposicionData.nombre}":`, error.message);
            }
        }

        console.log('\n📊 Resumen:');
        console.log(`   ✅ Disposiciones creadas: ${creadas}`);
        console.log(`   ⏭️  Disposiciones omitidas: ${omitidas}`);
        console.log(`   📝 Total en base de datos: ${await Disposicion.count()}`);

        console.log('\n🎉 Seed completado exitosamente!\n');

        // Mostrar disposiciones por tipo
        console.log('📋 Disposiciones por tipo:');
        const tipos = ['EXITOSA', 'NO_CONTACTO', 'SEGUIMIENTO', 'NO_EXITOSA'];

        for (const tipo of tipos) {
            const disposiciones = await Disposicion.findAll({
                where: { tipo },
                order: [['orden', 'ASC']]
            });
            console.log(`\n   ${tipo} (${disposiciones.length}):`);
            disposiciones.forEach(d => {
                const callback = d.requiereCallback ? '📞' : '  ';
                console.log(`   ${callback} - ${d.nombre}`);
            });
        }

        process.exit(0);

    } catch (error) {
        console.error('❌ Error en el seed:', error);
        process.exit(1);
    }
}

// Ejecutar seed
seedDisposiciones();
