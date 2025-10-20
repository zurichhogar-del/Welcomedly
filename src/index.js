import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import expressEjsLayouts from 'express-ejs-layouts';
import session from 'express-session';
import flash from 'connect-flash';
import cors from 'cors';
import morgan from 'morgan';
import sequelize from './database/connection.js';
import indexRoutes from './routes/index.js';
import { helmetConfig } from './middlewares/securityMiddleware.js';
import { injectCSRFToken, csrfProtection, secureSessionCookie } from './middlewares/csrfMiddleware.js';
import { notFoundHandler, errorHandler, sequelizeErrorHandler } from './middlewares/errorMiddleware.js';
import 'dotenv/config';

// Validar variables de entorno críticas
const requiredEnvVars = ['DB_PASSWORD', 'SESSION_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error(`❌ Error: Faltan variables de entorno: ${missingVars.join(', ')}`);
    console.error('💡 Crea un archivo .env basado en .env.example');
    process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// Configuración básica
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));
app.use(expressEjsLayouts);
app.set('layout', './layouts/authLayout');

// Middlewares de seguridad
app.use(helmetConfig);
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));

// Logging
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Rutas para PWA y APIs estáticas (PRIMERO - antes de middlewares que interfieran)
app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.sendFile(join(__dirname, 'public', 'manifest.json'));
});

app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Service-Worker-Allowed', '/');
    res.sendFile(join(__dirname, 'public', 'sw.js'));
});

// Ruta para Chrome DevTools (evita errores 404 en consola)
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => {
    res.status(204).end(); // 204 No Content - respuesta vacía exitosa
});

// Rate limiting general (versión mejorada compatible)
// import advancedSecurity from './middlewares/advancedSecurity.js'; // Desactivado temporalmente

// Rate limiting mejorado con detección de IP robusta
app.use((req, res, next) => {
    // Asegurar que req.ip esté disponible para rate limiting
    if (!req.ip && req.socket && req.socket.remoteAddress) {
        req.ip = req.socket.remoteAddress;
    }
    if (!req.ip && req.connection && req.connection.remoteAddress) {
        req.ip = req.connection.remoteAddress;
    }
    next();
});

// Middleware de seguridad enterprise (desactivado temporalmente por compatibilidad)
// app.use(advancedSecurity.inputSanitization());

// Middlewares básicos
app.use(express.static(join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 2 // 2 horas
    }
}));

// Configurar connect-flash
app.use(flash());

// Middleware de seguridad para sesión
app.use(secureSessionCookie);

// Middleware para inyectar token CSRF en vistas
app.use(injectCSRFToken);

// Middleware para mensajes flash
app.use((req, res, next) => {
    res.locals.swalError = req.session.swalError || req.flash('error')[0] || "";
    res.locals.mensajeExito = req.session.mensajeExito || req.flash('success')[0] || "";

    // Limpiar mensajes de sesión
    delete req.session.swalError;
    delete req.session.mensajeExito;

    next();
});

app.use((req, res, next) => {
    // Pasar session a todas las vistas
    res.locals.session = req.session;
    next();
});

// Ruta raíz antes de otros middlewares para evitar conflictos
app.get("/", (req, res) => {
    try {
        console.log('Accediendo a ruta raíz directa');
        if (req.session && req.session.usuario) {
            console.log('Usuario autenticado, redirigiendo a market');
            return res.redirect('/market/market');
        }
        console.log('Renderizando landing page directa');
        res.render('landing', {
            layout: false,
            title: 'Welcomedly - Plataforma de Gestión de Call Center'
        });
    } catch (error) {
        console.error('Error en ruta raíz directa:', error);
        res.status(500).send('Error interno del servidor: ' + error.message);
    }
});

// Rutas
app.use(indexRoutes);

// Middleware para rutas no encontradas (404)
app.use(notFoundHandler);

// Middleware de manejo de errores de Sequelize
app.use(sequelizeErrorHandler);

// Middleware centralizado de manejo de errores (debe ir al final)
app.use(errorHandler);

// Iniciar servidor
async function iniciarServidor() {
    try {
        await sequelize.authenticate();
        // No ejecutar sync para evitar errores de constraints
        console.log('✅ Base de datos conectada correctamente');

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`🚀 Servidor en http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("❌ Error de inicio:", error);
        process.exit(1);
    }
}

iniciarServidor();