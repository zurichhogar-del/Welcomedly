import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import expressEjsLayouts from 'express-ejs-layouts';
import session from 'express-session';
import sequelize from './database/connection.js';
import indexRoutes from './routes/index.js';
import 'dotenv/config'; // Asegúrate de instalar el paquete dotenv

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// Configuración básica
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));
app.use(expressEjsLayouts);
app.set('layout', './layouts/authLayout');

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

app.use((req, res, next) => {
  // Pasar session a todas las vistas
    res.locals.session = req.session;
    next();
});


// Rutas
app.use(indexRoutes);

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