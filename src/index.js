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
import { helmetConfig, generalLimiter } from './middlewares/securityMiddleware.js';
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

// Rate limiting general
app.use(generalLimiter);

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
        await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
        
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