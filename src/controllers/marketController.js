import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import sequelize from '../database/connection.js';
import _ from 'lodash';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { measureQuery, userBasicInclude } from '../utils/queryOptimization.js'; // Sprint 2.3.2

import db from '../models/index.js'
const Campana = db.Campana
const Formulario = db.Formulario
const BaseCampana = db.BaseCampana
const User = db.User
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


export function vistaMarket(req, res) {
    res.render("marketViews/market");
}

export async function formularios(req, res) {
    try {
        const formularios = await Formulario.findAll();
        res.render("marketViews/formularios", { formularios });
    } catch (error) {
        console.error("❌ Error al cargar formularios:", error);
        req.session.swalError = "Error al cargar formularios";
        res.redirect('/market');
    }
}


export function crearFormulario(req, res) {
    res.render("marketViews/crear_formulario");
}

export function formularioEnProceso(req, res) {
    res.render("marketViews/formulario_en_proceso");
}

export function formularioNoContesta(req, res) {
    res.render("marketViews/formulario_no_contesta");
}

export function formularioNoVenta(req, res) {
    res.render("marketViews/formulario_no_venta");
}

export async function guardarFormulario(req, res) {
    try {
        const { nombre, campos } = req.body;
        
        if (!campos?.length) {
            req.session.swalError = "Debe agregar al menos una tipificación";
            return res.redirect("/market/crear-formulario");
        }

        await Formulario.create({
            nombre,
            campos: campos.filter(Boolean)
        });

        req.session.mensajeExito = `Formulario ${nombre} creado`;
        res.redirect("/market/formularios");

    } catch (error) {
        console.error("Error guardando formulario:", error);
        req.session.swalError = error.message.includes("unique") 
            ? "El nombre ya existe" 
            : "Error al guardar";
        res.redirect("/market/crear-formulario");
    }
}

export async function eliminarFormulario(req, res) {
    try {
        await Formulario.destroy({ where: { id: req.params.id } });
        req.session.mensajeExito = "Formulario eliminado";
    } catch (error) {
        console.error("Error eliminando:", error);
        req.session.swalError = "No se pudo eliminar el formulario";
    }
    res.redirect('/market/formularios');
}

export async function mostrarEditarFormulario(req, res) {
    try {
        const formulario = await Formulario.findByPk(req.params.id);
        if (!formulario) {throw new Error("Formulario no encontrado");}
        
        res.render('marketViews/editar_formulario', { formulario });
    } catch (error) {
        console.error("Error cargando edición:", error);
        req.session.swalError = error.message;
        res.redirect('/market/formularios');
    }
}

export async function actualizarFormulario(req, res) {
    try {
        const { id } = req.params;
        const { nombre, campos } = req.body;
        
        await Formulario.update(
            { nombre, campos: campos.filter(Boolean) },
            { where: { id } }
        );
        
        req.session.mensajeExito = "Cambios guardados";
    } catch (error) {
        console.error("Error actualizando:", error);
        req.session.swalError = "Error al actualizar";
    }
    res.redirect('/market/formularios');
}


//mostrar el formulario de la campaña
export async function mostrarFormularioCampana(req, res) {
    try {
        // Sprint 2.3.2: Medir queries y usar attributes optimizados
        const [formularios, agentes] = await Promise.all([
            measureQuery('getFormularios', () => Formulario.findAll()),
            measureQuery('getActiveAgents', () => User.findAll({
                where: {
                    rol: "AGENTE",
                    estado: true
                },
                attributes: ['id', 'primerNombre', 'primerApellido'] // Solo datos necesarios
            }))
        ]);

        res.render('marketViews/crear_campaña', {
            formularios,
            agentes
        });
    } catch (error) {
        console.error("❌ Error al cargar formularios:", error);
        req.session.swalError = "❌ Error al cargar formularios.";
        return res.redirect('/market/crear-campana');
    }
}

//post para crear la campaña
export const crearCampana = async (req, res) => {
    const { nombre, formularioVenta, agentes } = req.body;
    const archivoCSV = req.file;
    const registros = [];
    const erroresCSV = [];

    try {
        // Validaciones básicas
        if (!archivoCSV) {throw new Error('Debes subir un archivo CSV');}
        if (!agentes || !Array.isArray(agentes) || agentes.length === 0) {
            throw new Error('Selecciona al menos un agente');
        }

        // Construir ruta del archivo correctamente
        const csvPath = path.join(
            process.cwd(), // Directorio raíz del proyecto
            'uploads',
            'csv',
            archivoCSV.filename
        );

        // Procesar CSV
        await new Promise((resolve, reject) => {
            fs.createReadStream(csvPath)
                .pipe(csv())
                .on('data', (row) => {
                    try {
                        // Normalización de campos
                        const normalizedRow = {};
                        for (const key in row) {
                            const normalizedKey = key.toLowerCase()
                                .trim()
                                .normalize("NFD")
                                .replace(/[\u0300-\u036f]/g, "")
                                .replace(/[^a-z0-9]/g, "");
                            
                            normalizedRow[normalizedKey] = row[key]?.toString().trim() || null;
                        }

                        // Validación de campos requeridos
                        const camposRequeridos = ['nombre', 'telefono', 'correo'];
                        const erroresFila = [];
                        
                        camposRequeridos.forEach(campo => {
                            const valor = normalizedRow[campo];
                            if (!valor || valor.trim() === '') {
                                erroresFila.push(`${campo}`);
                            }
                        });

                        if (erroresFila.length > 0) {
                            throw new Error(`Campos requeridos faltantes: ${erroresFila.join(', ')}`);
                        }

                        // Limpieza y transformación de datos
                        const procesado = {
                            nombre: normalizedRow.nombre,
                            telefono: normalizedRow.telefono.replace(/\D/g, ''),
                            correo: normalizedRow.correo.toLowerCase(),
                            otrosCampos: _.omit(normalizedRow, camposRequeridos)
                        };

                        registros.push(procesado);
                    } catch (error) {
                        erroresCSV.push({
                            línea: registros.length + 1,
                            error: error.message,
                            datos: row
                        });
                    }
                })
                .on('end', () => resolve())
                .on('error', (error) => reject(error));
        });

        // Manejar errores del CSV
        if (erroresCSV.length > 0) {
            req.session.swalError = `
                Se encontraron ${erroresCSV.length} errores:
                ${erroresCSV.map(e => `• Línea ${e.línea}: ${e.error}`).join('\n')}
            `;
            if (fs.existsSync(csvPath)) {fs.unlinkSync(csvPath);}
            return res.redirect('/market/crear-campana');
        }

        // Transacción de base de datos
        const transaction = await sequelize.transaction();
        try {
            // Crear campaña
            const campana = await Campana.create({
                nombre,
                formularioId: formularioVenta,
                baseDatos: archivoCSV.filename,
                agentesAsignados: agentes
            }, { transaction });

            console.log("[DEBUG] Campaña creada:", campana.toJSON());

            // Asignación equitativa de registros
            const registrosPorAgente = Math.ceil(registros.length / agentes.length);

            for (let i = 0; i < registros.length; i++) {
                const agenteIndex = Math.floor(i / registrosPorAgente) % agentes.length;
                await BaseCampana.create({
                    ...registros[i],
                    campanaId: campana.id,
                    agenteId: agentes[agenteIndex]
                }, { transaction });
            }

            await transaction.commit();
            if (fs.existsSync(csvPath)) {fs.unlinkSync(csvPath);} // Limpiar archivo
            req.session.mensajeExito = `✅ Campaña "${nombre}" creada (${registros.length} contactos)`;
            res.redirect('/campaign/campanas');

        } catch (error) {
            await transaction.rollback();
            if (fs.existsSync(csvPath)) {fs.unlinkSync(csvPath);}
            throw new Error(`Error en base de datos: ${error.message}`);
        }

    } catch (error) {
        console.error('Error:', error.message);
        req.session.swalError = error.message;
        // Asegurar limpieza del archivo CSV en cualquier error
        if (archivoCSV?.filename) {
            const csvPath = path.join(process.cwd(), 'uploads', 'csv', archivoCSV.filename);
            if (fs.existsSync(csvPath)) {
                try {
                    fs.unlinkSync(csvPath);
                } catch (unlinkError) {
                    console.error('Error al eliminar archivo CSV:', unlinkError);
                }
            }
        }
        res.redirect('/market/crear-campana');
    }
};