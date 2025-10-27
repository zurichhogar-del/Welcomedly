import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import expressEjsLayouts from 'express-ejs-layouts';
import session from 'express-session';
import RedisStore from 'connect-redis';
import flash from 'connect-flash';
import cors from 'cors';
import morgan from 'morgan';
import sequelize from './database/connection.js';
import redisClient from './database/redisClient.js';
import logger from './utils/logger.js';
import indexRoutes from './routes/index.js';
import { helmetConfig } from './middlewares/securityMiddleware.js';
import { injectCSRFToken, csrfProtection, secureSessionCookie } from './middlewares/csrfMiddleware.js';
import { notFoundHandler, errorHandler, sequelizeErrorHandler } from './middlewares/errorMiddleware.js';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import SocketHandlers from './websocket/socketHandlers.js';
import metricsSyncJob from './jobs/metricsSync.js';
import { redisClient as redisClientConfig, connectRedis, isRedisAvailable } from './config/redis.js';
import telephonyService from './services/telephonyService.js';
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

// Configurar Redis Session Store
const sessionStore = new RedisStore({
    client: redisClient,
    prefix: 'sess:',
    ttl: 8 * 60 * 60 // 8 horas en segundos
});

// Guardar sessionStore para uso en WebSocket
app.set('sessionStore', sessionStore);

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Renovar cookie en cada request
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 8 * 60 * 60 * 1000, // 8 horas en milisegundos
        sameSite: 'lax'
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
        logger.debug('Accediendo a ruta raíz directa');
        if (req.session && req.session.usuario) {
            logger.info('Usuario autenticado, redirigiendo a market', { userId: req.session.usuario.id });
            return res.redirect('/market/market');
        }
        logger.debug('Renderizando landing page directa');
        res.render('landing', {
            layout: false,
            title: 'Welcomedly - Plataforma de Gestión de Call Center'
        });
    } catch (error) {
        logger.error('Error en ruta raíz directa', { error: error.message, stack: error.stack });
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

// Iniciar servidor con soporte WebSocket
async function iniciarServidor() {
    try {
        await sequelize.authenticate();
        // No ejecutar sync para evitar errores de constraints
        console.log('✅ Base de datos conectada correctamente');

        // Sprint 3.1.4: Inicializar servicio de telefonía (si está configurado)
        if (process.env.ASTERISK_HOST) {
            try {
                await telephonyService.initialize();
                logger.info('✅ Telephony service initialized', {
                    component: 'telephony',
                    asterisk: `${process.env.ASTERISK_HOST}:${process.env.ASTERISK_PORT}`
                });
            } catch (error) {
                logger.error('❌ Failed to initialize telephony service:', {
                    component: 'telephony',
                    error: error.message
                });
                logger.warn('⚠️  Continuing without telephony...', { component: 'telephony' });
            }
        } else {
            logger.info('⚠️  Telephony disabled (ASTERISK_HOST not configured)', {
                component: 'telephony'
            });
        }

        const PORT = process.env.PORT || 3000;

        // Crear servidor HTTP para soporte WebSocket
        const server = createServer(app);

        // Configurar Socket.IO
        const io = new SocketIOServer(server, {
            cors: {
                origin: process.env.CORS_ORIGIN || "http://localhost:3000",
                methods: ["GET", "POST"],
                credentials: true
            },
            transports: ['websocket', 'polling'],
            upgrade: true,
            rememberUpgrade: true
        });

        // Configurar Redis Adapter para clustering (Fase 4.1)
        try {
            await connectRedis();

            if (isRedisAvailable()) {
                const pubClient = redisClientConfig.duplicate();
                const subClient = redisClientConfig.duplicate();

                await Promise.all([
                    pubClient.connect(),
                    subClient.connect()
                ]);

                io.adapter(createAdapter(pubClient, subClient));

                const instanceId = process.env.INSTANCE_ID || 'standalone';
                logger.info(`✓ Socket.IO Redis Adapter habilitado [${instanceId}]`, {
                    component: 'websocket',
                    redis: `${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
                });
            } else {
                logger.warn('⚠️  Socket.IO ejecutándose sin Redis Adapter - clustering deshabilitado', {
                    component: 'websocket'
                });
            }
        } catch (error) {
            logger.error('❌ Error configurando Socket.IO Redis Adapter:', {
                component: 'websocket',
                error: error.message
            });
            logger.warn('⚠️  Continuando sin clustering...', { component: 'websocket' });
        }

        // Obtener el session store configurado para pasarlo a WebSocket
        const sessionStore = app.get('sessionStore');

        // Inicializar manejadores de WebSocket con session store
        const socketHandlers = new SocketHandlers(io, sessionStore);

        // Exponer io global para acceso desde otros módulos
        global.io = io;
        global.socketHandlers = socketHandlers;

        // Iniciar servidor
        server.listen(PORT, () => {
            logger.info(`🚀 Servidor iniciado en http://localhost:${PORT}`, {
                port: PORT,
                environment: process.env.NODE_ENV || 'development',
                nodeVersion: process.version
            });
            logger.info('🔌 WebSocket servidor habilitado');
            logger.info('📡 Socket.IO listo para conexiones');

            // Sprint 1.2: Iniciar job de sincronización de métricas
            metricsSyncJob.start();
            logger.info('⏱️  Metrics Sync Job: Iniciado (sync cada 60s)');
        });

        // Log estadísticas de conexión periódicamente
        setInterval(() => {
            const stats = socketHandlers.getConnectionStats();
            if (stats.connectedAgents > 0 || stats.connectedSupervisors > 0) {
                logger.info('📊 Estadísticas WebSocket', stats);
            }
        }, 60000); // Cada minuto

    } catch (error) {
        logger.error("❌ Error de inicio del servidor", {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
}

iniciarServidor();

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('📴 Shutting down gracefully...');
    if (telephonyService.connected) {
        await telephonyService.shutdown();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('📴 Shutting down gracefully...');
    if (telephonyService.connected) {
        await telephonyService.shutdown();
    }
    process.exit(0);
});