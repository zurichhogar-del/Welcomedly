/**
 * API Gateway - Enterprise Gateway para Microservicios
 * Centraliza rutas, auth, rate limiting y monitoring
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware } from 'http-proxy-middleware';
import jwtService from '../services/jwtService.js';
import { helmetConfig } from '../middlewares/securityMiddleware.js';
import morgan from 'morgan';
import cors from 'cors';

class APIGateway {
    constructor() {
        this.app = express();
        this.port = process.env.GATEWAY_PORT || 3001;
        this.services = new Map();
        this.rateLimiters = new Map();

        this.setupMiddleware();
        this.setupServices();
        this.setupRoutes();
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmetConfig);

        // CORS
        this.app.use(cors({
            origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-ID']
        }));

        // Request logging
        this.app.use(morgan('combined', {
            stream: {
                write: (message) => console.log(`🌐 GATEWAY: ${message.trim()}`)
            }
        }));

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Request ID para tracing
        this.app.use((req, res, next) => {
            req.requestId = req.headers['x-request-id'] || this.generateRequestId();
            res.setHeader('X-Request-ID', req.requestId);
            next();
        });

        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: '1.0.0',
                services: Array.from(this.services.keys()),
                uptime: process.uptime()
            });
        });
    }

    setupServices() {
        // Definir microservicios disponibles
        this.services.set('auth', {
            target: process.env.AUTH_SERVICE_URL || 'http://localhost:3002',
            path: '/api/auth',
            description: 'Authentication & Authorization Service',
            healthCheck: '/health'
        });

        this.services.set('users', {
            target: process.env.USERS_SERVICE_URL || 'http://localhost:3003',
            path: '/api/users',
            description: 'User Management Service',
            healthCheck: '/health'
        });

        this.services.set('campaigns', {
            target: process.env.CAMPAIGNS_SERVICE_URL || 'http://localhost:3004',
            path: '/api/campaigns',
            description: 'Campaign Management Service',
            healthCheck: '/health'
        });

        this.services.set('agents', {
            target: process.env.AGENTS_SERVICE_URL || 'http://localhost:3005',
            path: '/api/agents',
            description: 'Agent Management Service',
            healthCheck: '/health'
        });

        this.services.set('analytics', {
            target: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3006',
            path: '/api/analytics',
            description: 'Analytics & Reporting Service',
            healthCheck: '/health'
        });

        this.services.set('ai', {
            target: process.env.AI_SERVICE_URL || 'http://localhost:3007',
            path: '/api/ai',
            description: 'AI Service',
            healthCheck: '/health'
        });

        this.services.set('notifications', {
            target: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3008',
            path: '/api/notifications',
            description: 'Notifications Service',
            healthCheck: '/health'
        });

        console.log(`🌐 Configured ${this.services.size} microservices`);
    }

    setupRoutes() {
        // Rate limiting global
        const globalLimiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 1000, // Limit each IP to 1000 requests per windowMs
            message: {
                error: 'TOO_MANY_REQUESTS',
                message: 'Rate limit exceeded',
                retryAfter: '15 minutes'
            },
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res) => {
                console.warn(`🚨 Rate limit exceeded for IP: ${req.ip}`);
                res.status(429).json({
                    success: false,
                    error: 'TOO_MANY_REQUESTS',
                    message: 'Rate limit exceeded',
                    retryAfter: '15 minutes',
                    requestId: req.requestId
                });
            }
        });

        this.app.use(globalLimiter);

        // Route para cada microservicio
        for (const [serviceName, config] of this.services) {
            this.setupServiceRoutes(serviceName, config);
        }

        // API documentation endpoint
        this.app.get('/api/docs', (req, res) => {
            const docs = {
                title: 'Welcomedly API Gateway Documentation',
                version: '1.0.0',
                services: {}
            };

            for (const [serviceName, config] of this.services) {
                docs.services[serviceName] = {
                    description: config.description,
                    basePath: config.path,
                    proxyTarget: config.target,
                    authentication: 'JWT Bearer Token required',
                    rateLimit: this.getServiceRateLimit(serviceName)
                };
            }

            res.json(docs);
        });

        // Service discovery endpoint
        this.app.get('/api/services', (req, res) => {
            const services = {};

            for (const [serviceName, config] of this.services) {
                services[serviceName] = {
                    name: serviceName,
                    description: config.description,
                    path: config.path,
                    status: 'active', // En producción, verificar health real
                    healthCheck: `${config.target}${config.healthCheck}`
                };
            }

            res.json({
                success: true,
                data: {
                    services,
                    gateway: {
                        version: '1.0.0',
                        uptime: process.uptime(),
                        environment: process.env.NODE_ENV || 'development'
                    }
                }
            });
        });

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                error: 'NOT_FOUND',
                message: `Route ${req.method} ${req.originalUrl} not found`,
                requestId: req.requestId,
                availableServices: Array.from(this.services.keys())
            });
        });

        // Global error handler
        this.app.use((err, req, res, next) => {
            console.error('🚨 Gateway Error:', err);

            res.status(err.status || 500).json({
                success: false,
                error: 'INTERNAL_ERROR',
                message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
                requestId: req.requestId
            });
        });
    }

    setupServiceRoutes(serviceName, config) {
        const serviceLimiter = this.getServiceRateLimit(serviceName);

        // Authentication middleware para servicios protegidos
        const authMiddleware = this.requiresAuth(serviceName)
            ? jwtService.authenticateToken()
            : (req, res, next) => next();

        // Proxy middleware configuration
        const proxyConfig = {
            target: config.target,
            changeOrigin: true,
            pathRewrite: {
                [`^${config.path}`: ''
            },
            onError: (err, req, res) => {
                console.error(`🚨 Service ${serviceName} error:`, err.message);
                res.status(503).json({
                    success: false,
                    error: 'SERVICE_UNAVAILABLE',
                    message: `Service ${serviceName} is currently unavailable`,
                    service: serviceName,
                    requestId: req.requestId
                });
            },
            onProxyReq: (proxyReq, req) => {
                // Forward headers al microservicio
                if (req.user) {
                    proxyReq.setHeader('X-User-ID', req.user.id);
                    proxyReq.setHeader('X-User-Role', req.user.rol);
                    proxyReq.setHeader('X-Session-ID', req.user.sessionId);
                }
                proxyReq.setHeader('X-Request-ID', req.requestId);
                proxyReq.setHeader('X-Gateway-Request', 'true');
            },
            onProxyRes: (proxyRes, req, res) => {
                // Add service response headers
                proxyRes.headers['X-Gateway-Service'] = serviceName;
                proxyRes.headers['X-Gateway-Response-Time'] = Date.now() - req.startTime + 'ms';
            }
        };

        // Apply rate limiting, auth and proxy
        this.app.use(config.path, serviceLimiter, authMiddleware, createProxyMiddleware(proxyConfig));

        console.log(`🔗 Service ${serviceName} configured at ${config.path} -> ${config.target}`);
    }

    getServiceRateLimit(serviceName) {
        // Rate limiting específico por servicio
        const limits = {
            auth: { windowMs: 15 * 60 * 1000, max: 100 },    // 100 requests/15min
            users: { windowMs: 15 * 60 * 1000, max: 200 },   // 200 requests/15min
            campaigns: { windowMs: 15 * 60 * 1000, max: 300 }, // 300 requests/15min
            agents: { windowMs: 15 * 60 * 1000, max: 250 },   // 250 requests/15min
            analytics: { windowMs: 15 * 60 * 1000, max: 400 }, // 400 requests/15min
            ai: { windowMs: 15 * 60 * 1000, max: 150 },       // 150 requests/15min
            notifications: { windowMs: 15 * 60 * 1000, max: 500 } // 500 requests/15min
        };

        const config = limits[serviceName] || { windowMs: 15 * 60 * 1000, max: 200 };

        return rateLimit({
            windowMs: config.windowMs,
            max: config.max,
            message: {
                success: false,
                error: 'SERVICE_RATE_LIMIT_EXCEEDED',
                message: `Rate limit exceeded for ${serviceName} service`,
                service: serviceName,
                retryAfter: '15 minutes'
            },
            standardHeaders: true,
            legacyHeaders: false,
            keyGenerator: (req) => {
                // Use user ID if authenticated, otherwise IP
                return req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
            }
        });
    }

    requiresAuth(serviceName) {
        // Services that don't require authentication
        const publicServices = ['auth'];

        return !publicServices.includes(serviceName);
    }

    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async start() {
        try {
            // Check if port is available
            const server = this.app.listen(this.port, () => {
                console.log(`🌐 API Gateway running on port ${this.port}`);
                console.log(`📚 API Documentation: http://localhost:${this.port}/api/docs`);
                console.log(`🔍 Service Discovery: http://localhost:${this.port}/api/services`);
                console.log(`❤️  Health Check: http://localhost:${this.port}/health`);
            });

            // Graceful shutdown
            process.on('SIGTERM', () => this.gracefulShutdown(server));
            process.on('SIGINT', () => this.gracefulShutdown(server));

            return server;

        } catch (error) {
            console.error('Failed to start API Gateway:', error);
            process.exit(1);
        }
    }

    async gracefulShutdown(server) {
        console.log('🛑 Shutting down API Gateway gracefully...');

        server.close(() => {
            console.log('✅ API Gateway stopped');
            process.exit(0);
        });

        // Force shutdown after 30 seconds
        setTimeout(() => {
            console.error('❌ Forcing shutdown');
            process.exit(1);
        }, 30000);
    }

    // Service registration para dynamic discovery
    registerService(serviceName, config) {
        this.services.set(serviceName, config);
        console.log(`📝 Service ${serviceName} registered dynamically`);
    }

    unregisterService(serviceName) {
        if (this.services.has(serviceName)) {
            this.services.delete(serviceName);
            console.log(`🗑️  Service ${serviceName} unregistered`);
        }
    }

    getServices() {
        return Array.from(this.services.keys());
    }

    getServiceHealth(serviceName) {
        // En producción, implementar health checks reales
        return Promise.resolve({
            service: serviceName,
            status: 'healthy',
            timestamp: new Date().toISOString()
        });
    }
}

export default APIGateway;