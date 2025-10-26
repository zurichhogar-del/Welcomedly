import { createClient } from 'redis';

/**
 * Redis Client Configuration
 * Fase 4.1: Clustering y Alta Disponibilidad
 */

const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: process.env.REDIS_DB || 0,
};

// Crear cliente de Redis
const redisClient = createClient({
    socket: {
        host: redisConfig.host,
        port: redisConfig.port,
    },
    password: redisConfig.password,
    database: redisConfig.db,
});

// Event listeners
redisClient.on('connect', () => {
    console.log('[Redis] Connecting to Redis server...');
});

redisClient.on('ready', () => {
    console.log(`[Redis] ✓ Connected to Redis at ${redisConfig.host}:${redisConfig.port}`);
});

redisClient.on('error', (err) => {
    console.error('[Redis] Error:', err.message);
});

redisClient.on('end', () => {
    console.log('[Redis] Connection closed');
});

// Conectar al iniciar
async function connectRedis() {
    try {
        if (!redisClient.isOpen) {
            await redisClient.connect();
        }
        return true;
    } catch (error) {
        console.error('[Redis] Failed to connect:', error.message);
        console.warn('[Redis] ⚠️  Running without Redis - clustering features disabled');
        return false;
    }
}

// Función para verificar si Redis está disponible
function isRedisAvailable() {
    return redisClient.isReady;
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('[Redis] Closing Redis connection...');
    await redisClient.quit();
});

export { redisClient, connectRedis, isRedisAvailable };
export default redisClient;
