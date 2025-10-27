import dotenv from 'dotenv';
dotenv.config();

const config = {
    development: {
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'miappdb',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        // Pool optimizado para desarrollo
        pool: {
            max: 10,
            min: 2,
            acquire: 30000,
            idle: 10000,
            evict: 1000,
            handleDisconnects: true
        }
    },
    production: {
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false,
        // Pool optimizado para alta concurrencia (10K usuarios)
        pool: {
            max: 20, // Más conexiones para soportar carga
            min: 5, // Mantener conexiones activas
            acquire: 60000, // Más tiempo para adquirir conexión
            idle: 10000, // Tiempo antes de liberar conexión inactiva
            evict: 1000, // Intervalo para limpiar conexiones muertas
            handleDisconnects: true // Auto-reconexión en caso de desconexión
        }
    }
};

export default config;