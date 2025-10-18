import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import expressEjsLayouts from 'express-ejs-layouts';
import session from 'express-session';
import { createServer } from 'http';
import { Server } from 'socket.io';
import sequelize from './database/connection.js';
import indexRoutes from './routes/index.js';
import { setUserInTemplate } from './middlewares/rbacMiddleware.js';
import webSocketService from './services/websocketService.js';
import 'dotenv/config'; // Asegúrate de instalar el paquete dotenv

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const io = new Server(server);

// Configuración básica
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));
app.use(expressEjsLayouts);
app.set('layout', './layouts/authLayout');

// Make io available to routes
app.set('io', io);

// Initialize WebSocket service
webSocketService.initialize(io);

// Middlewares
app.use(express.static(join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'un_secreto_muy_seguro', // 🔑 Clave obligatoria
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS en producción
        maxAge: 1000 * 60 * 60 * 2 // 2 horas
    }
}));
app.use((req, res, next) => {
  // Obtener mensajes de la sesión o inicializar como cadena vacía
    res.locals.swalError = req.session.swalError || "";
    res.locals.mensajeExito = req.session.mensajeExito || "";

    // Limpiar los mensajes después de usarlos
    delete req.session.swalError;
    delete req.session.mensajeExito;
    
    next();
});

// User template middleware
app.use(setUserInTemplate);

app.use((req, res, next) => {
  // Pasar session a todas las vistas
    res.locals.session = req.session;
    next();
});


// Rutas
app.use(indexRoutes);

// Add routes for admin and operations dashboards
app.get('/admin/dashboard', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/auth/login');
    }
    if (req.session.usuario.rol !== 'ADMIN') {
        return res.status(403).send('Acceso denegado');
    }
    res.render('adminViews/dashboard', {
        layout: 'layouts/generalLayout',
        pageTitle: 'Panel de Administración'
    });
});

// Iniciar servidor
async function iniciarServidor() {
    try {
        await sequelize.authenticate();
        await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
        
        // Initialize roles and permissions
        await initializeRolesAndPermissions();
        
        const PORT = process.env.PORT || 3000;
        server.listen(PORT, () => {
            console.log(`🚀 Servidor en http://localhost:${PORT}`);
            console.log(`📊 Dashboard Operaciones: http://localhost:${PORT}/operations/dashboard`);
        });
    } catch (error) {
        console.error("❌ Error de inicio:", error);
        process.exit(1);
    }
}

// Initialize default roles and permissions
async function initializeRolesAndPermissions() {
    const { Role, Permission } = await import('./models/index.js');
    
    try {
        // Create default permissions
        const permissions = [
            { name: 'manage_users', description: 'Gestionar usuarios', resource: 'users', action: 'manage' },
            { name: 'view_agents', description: 'Ver agentes', resource: 'agents', action: 'read' },
            { name: 'monitor_agents', description: 'Monitorear agentes', resource: 'agents', action: 'update' },
            { name: 'manage_campaigns', description: 'Gestionar campañas', resource: 'campaigns', action: 'manage' },
            { name: 'view_reports', description: 'Ver reportes', resource: 'reports', action: 'read' },
            { name: 'manage_agent_status', description: 'Gestionar estado de agentes', resource: 'agents', action: 'update' },
        ];
        
        for (const perm of permissions) {
            await Permission.findOrCreate({ where: { name: perm.name }, defaults: perm });
        }
        
        // Create default roles
        const roles = [
            { name: 'ADMIN', description: 'Administrador del sistema' },
            { name: 'OPERATIONS', description: 'Administrador de operaciones' },
            { name: 'AGENTE', description: 'Agente de call center' }
        ];
        
        for (const roleData of roles) {
            const [role, created] = await Role.findOrCreate({ 
                where: { name: roleData.name }, 
                defaults: roleData 
            });
            
            if (created) {
                // Assign permissions based on role
                const allPermissions = await Permission.findAll();
                
                if (roleData.name === 'ADMIN') {
                    await role.setPermissions(allPermissions);
                } else if (roleData.name === 'OPERATIONS') {
                    const opsPermissions = allPermissions.filter(p => 
                        ['view_agents', 'monitor_agents', 'manage_campaigns', 'view_reports', 'manage_agent_status'].includes(p.name)
                    );
                    await role.setPermissions(opsPermissions);
                }
            }
        }
        
        console.log('✅ Roles y permisos inicializados correctamente');
    } catch (error) {
        console.error('❌ Error inicializando roles y permisos:', error);
    }
}

iniciarServidor();