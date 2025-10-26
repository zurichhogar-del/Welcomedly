import sequelize from '../database/connection.js'
import campaignService from '../services/campaignService.js'
import { measureQuery } from '../utils/queryOptimization.js' // Sprint 2.3.2

import db from '../models/index.js'
const Campana = db.Campana
const Formulario = db.Formulario
const BaseCampana = db.BaseCampana
const User = db.User


// Mostrar formulario
export async function mostrarFormularioRegistro(req, res) {
    try {
        const { id } = req.params;
        const campana = await Campana.findByPk(id);
        
        if (!campana) {
            req.session.swalError = "Campaña no encontrada";
            return res.redirect('/campaign/campanas');
        }

        res.render('campaignViews/agregar_registro', {
            campana: campana.toJSON()
        });

    } catch (error) {
        console.error('Error:', error);
        req.session.swalError = "Error al cargar el formulario";
        res.redirect('/campaign/campanas');
    }
}

// Procesar formulario
export async function agregarRegistroManual(req, res) {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { nombre, telefono, correo, ...datosExtra } = req.body;

        // Validación mejorada
        if (!nombre?.trim() || !telefono?.trim() || !correo?.trim()) {
            throw new Error("Todos los campos obligatorios deben estar completos");
        }

        // Procesamiento de datos adicionales
        const otrosCampos = {};
        Object.entries(datosExtra).forEach(([key, value]) => {
            if (value && key !== 'id' && key !== 'campanaId') {
                otrosCampos[key] = value;
            }
        });

        // Crear registro optimizado para JSONB
        await BaseCampana.create({
            nombre: nombre.trim(),
            telefono: telefono.replace(/\D/g, ''),
            correo: correo.toLowerCase().trim(),
            otrosCampos: Object.keys(otrosCampos).length > 0 ? otrosCampos : null,
            campanaId: id
        }, { transaction });

        await transaction.commit();
        req.session.mensajeExito = "✅ Registro agregado correctamente";
    } catch (error) {
        await transaction.rollback();
        console.error('Error:', error);
        req.session.swalError = error.message || "Error al guardar el registro";
    }
    res.redirect(`/campaign/campanas/${req.params.id}/ver-base`);
}

export function agregarRegistrosEnBloque(req, res) {
    res.render("campaignViews/agregar_registros_enbloque", { layout: 'layouts/generalLayout' });
}

export async function verCampanas(req, res) {
    try {
        // Sprint 2.3.1: Usar servicio con caché Redis (5 min TTL)
        const campanas = await campaignService.getAllCampaigns();

        res.render('campaignViews/campañas', {
            campanas: campanas.map(c => ({
                ...c,
                cantidadRegistros: c.cantidadRegistros,
                createdAt: c.createdAt
            }))
        });

    } catch (error) {
        console.error('Error al cargar campañas:', error);
        req.session.swalError = "Error interno al cargar las campañas";
        res.redirect('/campaign/campanas');
    }
}

export async function eliminarCampana(req, res) {
    const transaction = await sequelize.transaction();
    try {
        const { id } = req.params;
        
        await BaseCampana.destroy({ where: { campanaId: id }, transaction });
        await Campana.destroy({ where: { id }, transaction });

        await transaction.commit();
        req.session.mensajeExito = "Campaña eliminada exitosamente";
    } catch (error) {
        await transaction.rollback();
        console.error('Error eliminando campaña:', error);
        req.session.swalError = "No se pudo eliminar la campaña";
    }
    res.redirect('/campaign/campanas');
}

export function modificarCampana(req, res) {
    res.render("campaignViews/modificar_campaña", { layout: 'layouts/generalLayout' });
}

export function volverALlamar(req, res) {
    res.render("campaignViews/reg_volverallamar", { layout: 'layouts/generalLayout' });
}

export async function mostrarBaseDatosCampana(req, res) {
    try {
        const { id } = req.params;

        // Sprint 2.3.2: Usar servicio con caché (10 min TTL) y eager loading optimizado
        const campana = await measureQuery('getCampaignById', async () => {
            return await campaignService.getCampaignById(id);
        });

        res.render('campaignViews/ver_base', {
            campana: campana.toJSON(),
            registros: campana.registros.map(registro => ({
                ...registro.toJSON(),
                // Traducir el valor de la tipificación usando el formulario
                tipificacion: registro.tipificacion || "Sin gestionar",
                // Formatear nombre del agente
                agente: registro.agente
                    ? `${registro.agente.primerNombre} ${registro.agente.primerApellido}`
                    : "Sin asignar"
            }))
        });

    } catch (error) {
        console.error('Error cargando la base:', error);
        req.session.swalError = "Error al cargar los registros";
        res.redirect('/campaign/campanas');
    }
}

export async function mostrarFormularioGestion(req, res) {
    try {
        const { campanaId, registroId } = req.params;

        // 1. Obtener el registro con su campaña, formulario y disposición asociada
        const registro = await BaseCampana.findByPk(registroId, {
            include: [
                {
                    model: Campana,
                    as: 'campana',
                    include: [{
                        model: Formulario,
                        as: 'formulario'
                    }]
                },
                {
                    model: db.Disposicion,
                    as: 'disposicion',
                    required: false
                }
            ]
        });

        if (!registro) {
            req.session.swalError = "Registro no encontrado";
            return res.redirect(`/campaign/campanas/${campanaId}/ver-base`);
        }

        // 2. Extraer SOLO el campo de tipificación del formulario
        const opcionesTipificacion = registro.campana.formulario.campos || [];

        // 3. Renderizar con los datos específicos incluyendo disposición y callbacks
        res.render('campaignViews/iniciar_gestion', {
            registro: {
                ...registro.toJSON(),
                // Datos básicos
                nombre: registro.nombre,
                telefono: registro.telefono,
                correo: registro.correo,
                otrosCampos: registro.otrosCampos || {},
                // Datos de gestión
                intentosLlamada: registro.intentosLlamada || 0,
                ultimaLlamada: registro.ultimaLlamada,
                disposicion: registro.disposicion,
                callbackDate: registro.callbackDate,
                callbackNotas: registro.callbackNotas
            },
            opcionesTipificacion, // Envía solo el campo de tipificación
            campanaId
        });

    } catch (error) {
        console.error('Error al cargar gestión:', error);
        req.session.swalError = "Error al cargar el formulario de gestión";
        res.redirect(`/campaign/campanas/${campanaId}/ver-base`);
    }
}

export async function guardarGestion(req, res) {
    try {
        const { campanaId, registroId } = req.params;
        const { disposicionId, callbackDate, callbackNotas, tipificacion } = req.body;

        // Validar que se haya seleccionado una disposición
        if (!disposicionId) {
            throw new Error("⚠️ Debes seleccionar una disposición");
        }

        // Guardar disposición con callback usando el servicio
        await campaignService.saveDisposicion(registroId, {
            disposicionId: parseInt(disposicionId),
            callbackDate: callbackDate || null,
            callbackNotas: callbackNotas || null
        });

        // Si también hay tipificación del formulario, guardarla
        if (tipificacion) {
            await campaignService.saveTypification(registroId, tipificacion);
        }

        req.session.mensajeExito = "✅ Gestión guardada correctamente";
    } catch (error) {
        console.error('Error al guardar gestión:', error);
        req.session.swalError = error.message || "❌ Error al guardar la gestión";
    }

    res.redirect(`/campaign/campanas/${req.params.campanaId}/ver-base`);
}