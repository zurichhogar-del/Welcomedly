import bcrypt from 'bcryptjs';

import db from '../models/index.js'; // ✅ Importa todos los modelos correctamente
const User = db.User;

export function mostrarLogin(req, res) {
    res.render("authViews/login", {
        layout: 'layouts/authLayout',
    });
} 
export function mostrarOlvidoContrasena(req, res) {
    res.render("authViews/olvido_contraseña", {
        layout: 'layouts/authLayout',
    });
}  
export function mostrarRegistro(req, res) {
    res.render("authViews/registrarse_nuevo", {
        layout: 'layouts/authLayout',
    });
}

// NUEVA FUNCIÓN: Procesar login
export async function loginUsuario(req, res) {
    const { correo, contrasena } = req.body;

    try {
        const usuario = await User.findOne({ 
            where: { correo }, // Buscar por correo
            attributes: ['id', 'correo', 'contrasena', 'rol', 'estado', 'status']
        });

        if (!usuario || !usuario.estado) {
            req.session.alert = {
                type: 'error',
                message: 'Credenciales inválidas'
            };
            return res.redirect('/auth/login');
        }

        const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena);
        
        if (!contrasenaValida) {
            req.session.alert = {
                type: 'error',
                message: 'Credenciales inválidas'
            };
            return res.redirect('/auth/login');
        }

        // Set user session
        req.session.userId = usuario.id;
        req.session.usuario = {
            id: usuario.id,
            correo: usuario.correo,
            rol: usuario.rol
        };
        
        // Update user status to available on login
        await User.update(
            { 
                status: 'available',
                lastStatusChange: new Date()
            },
            { where: { id: usuario.id } }
        );
        
        req.session.alert = {
            type: 'success',
            message: `Bienvenido ${usuario.correo}`
        };
        
        // Redirect based on role
        if (usuario.rol === 'ADMIN') {
            res.redirect("/admin/dashboard");
        } else if (usuario.rol === 'OPERATIONS') {
            res.redirect("/operations/dashboard");
        } else {
            res.redirect("/market/market");
        }

    } catch (error) {
        console.error("Error en login:", error);
        req.session.alert = {
            type: 'error',
            message: 'Error en el servidor'
        };
        res.redirect('/auth/login');
    }
}   

export async function logoutUsuario(req, res) {
    try {
        if (req.session.userId) {
            // Update user status to offline on logout
            await User.update(
                { 
                    status: 'offline',
                    lastStatusChange: new Date()
                },
                { where: { id: req.session.userId } }
            );
        }
        
        req.session.destroy((err) => {
            if (err) {
                console.error("❌ Error al cerrar sesión:", err);
                return res.status(500).send("Error al cerrar sesión");
            }
            res.redirect("/auth/login");
        });
    } catch (error) {
        console.error("Error en logout:", error);
        req.session.destroy((err) => {
            if (err) {
                console.error("❌ Error al cerrar sesión:", err);
                return res.status(500).send("Error al cerrar sesión");
            }
            res.redirect("/auth/login");
        });
    }
}