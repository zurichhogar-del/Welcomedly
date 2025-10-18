import db from '../models/index.js';
const User = db.User

export function mostrarAgentes(req, res) {
    res.render("agentsViews/agentes", {
        layout: 'layouts/generalLayout',
    });
}

export function mostrarCrearAgente(req, res) {
    res.render("agentsViews/crear_agente", {
        layout: 'layouts/generalLayout',
    });
}

// Procesa el formulario y guarda el nuevo agente
export async function crearAgente(req, res) {
    const {
        primer_nombre,
        segundo_nombre,
        primer_apellido,
        segundo_apellido,
        identificacion,
        correo,
        password,
        rol
    } = req.body;

    const username = `${primer_nombre}.${identificacion.substring(0, 5)}`;

    try {
        // Validar si ya existe ese username o correo
        const usuarioExistente = await User.findOne({
            where: {
                username
            }
        });

    if (usuarioExistente) {
        req.session.swalError = "⚠️ El usuario ya existe";
        return res.redirect('/agents/crear-agente');
    }

        // Crear el usuario - El hook beforeCreate hashea automáticamente la contraseña
        await User.create({
            primerNombre: primer_nombre,
            segundoNombre: segundo_nombre,
            primerApellido: primer_apellido,
            segundoApellido: segundo_apellido,
            identificacion,
            correo,
            username,
            contrasena: password, // Se guarda en texto plano, el hook la hashea
            rol
        });

        req.session.mensajeExito = "✅ Agente creado exitosamente";
        res.redirect("/agents/lista-agentes");
    } catch (error) {
        console.error('❌ Error al crear el usuario:', error);
        req.session.swalError = "❌ Error al crear el agente";
        res.redirect('/agents/crear-agente');
    }
}

export async function mostrarListaAgentes(req, res) {
    try {
        const agentes = await User.findAll({
        where: { rol: 'AGENTE' } // Quita esta línea si quieres mostrar todos
    });

        res.render('agentsViews/lista_agentes', {
        layout: 'layouts/generalLayout', // cambia esto si usas otro layout
        agentes: agentes // asegúrate de pasarla bien
    });
    } catch (error) {
        console.error('❌ Error al listar agentes:', error);
        req.session.swalError = "❌ Error al listar agentes.";
        res.redirect('/agents/lista-agentes');
    }
}

export function mostrarMagicians(req, res) {
    res.render("agentsViews/magicians", {
        layout: 'layouts/generalLayout',
    });
}

export const eliminarAgente = async (req, res) => {
    const { id } = req.params;
    try {
        await User.destroy({ where: { id } });
        req.session.mensajeExito = "✅ Agente eliminado exitosamente";
        res.redirect('/agents/lista-agentes');
    } catch (error) {
        console.error('❌ Error al eliminar agente:', error);
        req.session.swalError = "❌ Error al eliminar el agente";
        res.redirect('/agents/lista-agentes');
    }
    };

    export const cambiarEstadoAgente = async (req, res) => {
    const { id } = req.params;
    try {
        const agente = await User.findByPk(id);

    if (!agente) {
        req.session.swalError = "⚠️ Agente no encontrado";
        return res.redirect('/agents/lista-agentes');
    }

    agente.estado = !agente.estado;
    await agente.save();

        req.session.mensajeExito = `✅ Estado del agente actualizado a ${agente.estado ? 'Activo' : 'Inactivo'}`;
        res.redirect('/agents/lista-agentes');

    } catch (error) {
        console.error('❌ Error al cambiar estado:', error);
        req.session.swalError = "❌ Error al cambiar el estado del agente";
        res.redirect('/agents/lista-agentes');
    }
};