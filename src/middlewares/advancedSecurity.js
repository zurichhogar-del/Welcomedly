/**
 * Advanced Security Middleware Suite
 * Enterprise-grade security con WAF, DDoS protection y compliance
 */

import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import helmet from 'helmet';
import validator from 'validator';
import crypto from 'crypto';
import { performance } from 'perf_hooks';

class AdvancedSecurity {
    constructor() {
        this.redis = null;
        this.blockedIPs = new Set();
        this.suspiciousActivities = new Map(); // IP -> activity count
        this.securityLogs = [];
        this.threatDetection = {
            sqlInjection: new Set(),
            xss: new Set(),
            pathTraversal: new Set(),
            bruteForce: new Map()
        };

        this.initializeRedis();
        this.setupSecurityConfig();
    }

    /**
     * Inicializar Redis para rate limiting distribuido
     */
    async initializeRedis() {
        try {
            this.redis = new Redis({
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD,
                retryDelayOnFailover: 100,
                maxRetriesPerRequest: 3,
                lazyConnect: true
            });

            this.redis.on('connect', () => {
                console.log('🔴 Redis connected for security services');
            });

            this.redis.on('error', (error) => {
                console.error('❌ Redis security error:', error);
            });

            // Conectar si está disponible
            if (process.env.REDIS_ENABLED !== 'false') {
                await this.redis.connect();
            }
        } catch (error) {
            console.warn('⚠️ Redis not available, using memory-based rate limiting');
            this.redis = null;
        }
    }

    /**
     * Configuración principal de seguridad
     */
    setupSecurityConfig() {
        this.securityConfig = {
            // Rate limiting tiers
            tiers: {
                public: { windowMs: 15 * 60 * 1000, max: 100 }, // 100 req/15min
                user: { windowMs: 15 * 60 * 1000, max: 1000 }, // 1000 req/15min
                premium: { windowMs: 15 * 60 * 1000, max: 5000 }, // 5000 req/15min
                admin: { windowMs: 15 * 60 * 1000, max: 10000 } // 10000 req/15min
            },
            // Security headers
            headers: {
                hsts: {
                    maxAge: 31536000,
                    includeSubDomains: true,
                    preload: true
                },
                csp: {
                    directives: {
                        defaultSrc: ["'self'"],
                        scriptSrc: [
                            "'self'",
                            "'unsafe-inline'",
                            "'unsafe-eval'",
                            "https://cdn.jsdelivr.net",
                            "https://code.jquery.com",
                            "https://www.googletagmanager.com"
                        ],
                        styleSrc: [
                            "'self'",
                            "'unsafe-inline'",
                            "https://cdn.jsdelivr.net",
                            "https://fonts.googleapis.com"
                        ],
                        imgSrc: ["'self'", "data:", "https:", "blob:"],
                        connectSrc: [
                            "'self'",
                            "ws:",
                            "wss:",
                            "https://api.openai.com",
                            "https://api.twilio.com"
                        ],
                        fontSrc: ["'self'", "https:", "data:"],
                        objectSrc: ["'none'"],
                        mediaSrc: ["'self'"],
                        frameSrc: ["'none'"],
                        childSrc: ["'none'"],
                        workerSrc: ["'self'", "blob:"],
                        manifestSrc: ["'self'"],
                        upgradeInsecureRequests: process.env.NODE_ENV === 'production'
                    }
                }
            },
            // DDoS protection
            ddos: {
                threshold: 1000, // requests per minute
                burstThreshold: 100, // requests in 10 seconds
                blacklistDuration: 3600000 // 1 hour
            },
            // Input validation
            validation: {
                maxFieldLength: 10000,
                allowedMimeTypes: [
                    'text/plain',
                    'text/html',
                    'application/json',
                    'application/x-www-form-urlencoded',
                    'multipart/form-data'
                ]
            }
        };
    }

    /**
     * WAF (Web Application Firewall) Middleware
     */
    webApplicationFirewall() {
        return (req, res, next) => {
            const startTime = performance.now();
            const clientIP = this.getClientIP(req);
            const userAgent = req.headers['user-agent'] || '';
            const url = req.originalUrl;

            try {
                // 1. IP Blacklist check
                if (this.blockedIPs.has(clientIP)) {
                    this.logSecurityEvent('IP_BLOCKED', {
                        ip: clientIP,
                        userAgent,
                        url,
                        reason: 'IP in blacklist'
                    });
                    return this.blockResponse(res, 'IP_BLOCKED');
                }

                // 2. DDoS detection
                if (this.detectDDoS(clientIP)) {
                    this.logSecurityEvent('DDOS_DETECTED', {
                        ip: clientIP,
                        userAgent,
                        url,
                        action: 'IP temporarily blocked'
                    });
                    this.blockIP(clientIP, 3600000); // 1 hour
                    return this.blockResponse(res, 'DDOS_PROTECTION');
                }

                // 3. SQL Injection detection
                if (this.detectSQLInjection(req)) {
                    this.logSecurityEvent('SQL_INJECTION_ATTEMPT', {
                        ip: clientIP,
                        userAgent,
                        url,
                        method: req.method
                    });
                    this.threatDetection.sqlInjection.add(clientIP);
                    return this.blockResponse(res, 'SECURITY_VIOLATION');
                }

                // 4. XSS detection
                if (this.detectXSS(req)) {
                    this.logSecurityEvent('XSS_ATTEMPT', {
                        ip: clientIP,
                        userAgent,
                        url,
                        method: req.method
                    });
                    this.threatDetection.xss.add(clientIP);
                    return this.blockResponse(res, 'SECURITY_VIOLATION');
                }

                // 5. Path traversal detection
                if (this.detectPathTraversal(req)) {
                    this.logSecurityEvent('PATH_TRAVERSAL_ATTEMPT', {
                        ip: clientIP,
                        userAgent,
                        url,
                        method: req.method
                    });
                    this.threatDetection.pathTraversal.add(clientIP);
                    return this.blockResponse(res, 'SECURITY_VIOLATION');
                }

                // 6. Suspicious user agent detection
                if (this.detectSuspiciousUserAgent(userAgent)) {
                    this.logSecurityEvent('SUSPICIOUS_USER_AGENT', {
                        ip: clientIP,
                        userAgent,
                        url
                    });
                    // Allow but monitor
                }

                // 7. Request size validation
                if (this.validateRequestSize(req)) {
                    return this.blockResponse(res, 'REQUEST_TOO_LARGE');
                }

                // 8. Add security headers
                this.addSecurityHeaders(res);

                // Log request for monitoring
                this.logRequest(req, performance.now() - startTime);

                next();

            } catch (error) {
                console.error('WAF Error:', error);
                this.logSecurityEvent('WAF_ERROR', {
                    ip: clientIP,
                    error: error.message,
                    url
                });
                next(); // Don't block on WAF errors
            }
        };
    }

    /**
     * Advanced Rate Limiting con Redis
     */
    createRateLimiter(options = {}) {
        const config = {
            windowMs: options.windowMs || this.securityConfig.tiers.public.windowMs,
            max: options.max || this.securityConfig.tiers.public.max,
            message: {
                success: false,
                error: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests, please try again later',
                retryAfter: Math.ceil(config.windowMs / 1000)
            },
            standardHeaders: true,
            legacyHeaders: false,
            keyGenerator: (req) => this.getRateLimitKey(req),
            skip: (req) => this.skipRateLimit(req),
            handler: (req, res) => {
                this.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
                    ip: this.getClientIP(req),
                    url: req.originalUrl,
                    userAgent: req.headers['user-agent']
                });

                res.status(429).json(config.message);
            }
        };

        // Use Redis store if available
        if (this.redis) {
            try {
                const store = new RedisStore({
                    sendCommand: (...args) => this.redis.call(...args),
                    prefix: `rl:${options.prefix || 'default'}:`
                });

                return rateLimit({
                    ...config,
                    store
                });
            } catch (error) {
                console.warn('Redis rate limiter failed, using memory store:', error.message);
            }
        }

        return rateLimit(config);
    }

    /**
     * Input Sanitization Middleware
     */
    inputSanitization() {
        return (req, res, next) => {
            try {
                // Create sanitized copies instead of modifying read-only properties
                if (req.query) {
                    req.sanitizedQuery = this.sanitizeObject(req.query);
                }

                if (req.body) {
                    req.sanitizedBody = this.sanitizeObject(req.body);
                }

                if (req.params) {
                    req.sanitizedParams = this.sanitizeObject(req.params);
                }

                next();
            } catch (error) {
                console.error('Input sanitization error:', error);
                this.logSecurityEvent('SANITIZATION_ERROR', {
                    ip: this.getClientIP(req),
                    error: error.message
                });
                next();
            }
        };
    }

    /**
     * CORS Security Middleware
     */
    corsSecurity() {
        const allowedOrigins = this.getAllowedOrigins();

        return (req, res, next) => {
            const origin = req.headers.origin;

            if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
                res.header('Access-Control-Allow-Origin', origin || '*');
            }

            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
            res.header('Access-Control-Allow-Headers', [
                'Origin',
                'X-Requested-With',
                'Content-Type',
                'Accept',
                'Authorization',
                'X-CSRF-Token',
                'X-Request-ID'
            ].join(', '));
            res.header('Access-Control-Allow-Credentials', 'true');
            res.header('Access-Control-Max-Age', '86400'); // 24 hours

            // Handle preflight requests
            if (req.method === 'OPTIONS') {
                return res.status(200).end();
            }

            next();
        };
    }

    /**
     * Request logging and monitoring
     */
    requestLogger() {
        return (req, res, next) => {
            const startTime = performance.now();
            const requestId = req.headers['x-request-id'] || this.generateRequestId();

            req.requestId = requestId;
            res.setHeader('X-Request-ID', requestId);

            // Log request
            const logData = {
                requestId,
                method: req.method,
                url: req.originalUrl,
                ip: this.getClientIP(req),
                userAgent: req.headers['user-agent'],
                timestamp: new Date().toISOString(),
                userId: req.user?.id || 'anonymous'
            };

            // Log response
            res.on('finish', () => {
                const responseTime = performance.now() - startTime;

                this.securityLogs.push({
                    ...logData,
                    statusCode: res.statusCode,
                    responseTime: Math.round(responseTime),
                    contentLength: res.get('content-length') || 0
                });

                // Log slow requests
                if (responseTime > 2000) {
                    this.logSecurityEvent('SLOW_REQUEST', {
                        ...logData,
                        responseTime: Math.round(responseTime),
                        statusCode: res.statusCode
                    });
                }

                // Log errors
                if (res.statusCode >= 400) {
                    this.logSecurityEvent('HTTP_ERROR', {
                        ...logData,
                        statusCode: res.statusCode,
                        responseTime: Math.round(responseTime)
                    });
                }
            });

            next();
        };
    }

    /**
     * Helper methods
     */
    getClientIP(req) {
        return req.headers['x-forwarded-for']?.split(',')[0] ||
               req.headers['x-real-ip'] ||
               req.connection?.remoteAddress ||
               req.socket?.remoteAddress ||
               req.ip ||
               'unknown';
    }

    getRateLimitKey(req) {
        const user = req.user;
        const ip = this.getClientIP(req);

        if (user) {
            // User-based rate limiting
            return `user:${user.id}:${user.rol}`;
        }

        // IP-based rate limiting
        return `ip:${ip}`;
    }

    skipRateLimit(req) {
        // Skip rate limiting for health checks and static assets
        const skipPaths = ['/health', '/favicon.ico', '/robots.txt'];
        return skipPaths.includes(req.path) || req.path.startsWith('/images/') || req.path.startsWith('/css/') || req.path.startsWith('/js/');
    }

    detectDDoS(ip) {
        const now = Date.now();
        const windowMs = 60000; // 1 minute
        const threshold = this.securityConfig.ddos.threshold;

        if (!this.suspiciousActivities.has(ip)) {
            this.suspiciousActivities.set(ip, []);
        }

        const activities = this.suspiciousActivities.get(ip);

        // Clean old activities
        const recent = activities.filter(time => now - time < windowMs);
        this.suspiciousActivities.set(ip, recent);

        // Add current activity
        recent.push(now);

        return recent.length > threshold;
    }

    detectSQLInjection(req) {
        const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
            /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
            /(\b(OR|AND)\s+['"]?[a-zA-Z]+['"]?\s*=\s*['"]?[a-zA-Z]+['"]?)/i,
            /(\b(OR|AND)\s+['"]?true['"]?)/i,
            /(--|#|\/\*|\*\/)/,
            /(\bWAITFOR\s+DELAY\b)/i,
            /(\bBENCHMARK\b)/i,
            /(\bSLEEP\b)/i,
            /(\bLOAD_FILE\b)/i,
            /(\bINTO\s+OUTFILE\b)/i
        ];

        const checkValue = (value) => {
            if (typeof value !== 'string') {return false;}
            return sqlPatterns.some(pattern => pattern.test(value));
        };

        // Check all input sources
        const sources = [req.query, req.body, req.params];

        for (const source of sources) {
            if (!source) {continue;}

            for (const [key, value] of Object.entries(source)) {
                if (checkValue(value)) {
                    return true;
                }

                // Check nested objects
                if (typeof value === 'object' && value !== null) {
                    for (const nestedValue of Object.values(value)) {
                        if (checkValue(nestedValue)) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    detectXSS(req) {
        const xssPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /<img[^>]*src[^>]*javascript:/gi,
            /<\s*script/gi,
            /expression\s*\(/gi,
            /url\s*\(\s*['"]*javascript:/gi,
            /@import/gi
        ];

        const checkValue = (value) => {
            if (typeof value !== 'string') {return false;}
            return xssPatterns.some(pattern => pattern.test(value));
        };

        const sources = [req.query, req.body, req.params];

        for (const source of sources) {
            if (!source) {continue;}

            for (const [key, value] of Object.entries(source)) {
                if (checkValue(value)) {
                    return true;
                }

                if (typeof value === 'object' && value !== null) {
                    for (const nestedValue of Object.values(value)) {
                        if (checkValue(nestedValue)) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    detectPathTraversal(req) {
        const pathTraversalPatterns = [
            /\.\.[\/\\]/,
            /%2e%2e[\/\\]/i,
            /\.\.%2f/i,
            /\.\.%5c/i,
            /%2e%2e%2f/i,
            /%2e%2e%5c/i,
            /\.\.\/\.\.\//,
            /\.\.\\/,
            /\/etc\/passwd/i,
            /\/windows\/system32/i
        ];

        const checkPath = (path) => {
            if (typeof path !== 'string') {return false;}
            return pathTraversalPatterns.some(pattern => pattern.test(path));
        };

        // Check URL and parameters
        if (checkPath(req.originalUrl)) {return true;}

        for (const [key, value] of Object.entries(req.params)) {
            if (checkPath(value)) {return true;}
        }

        return false;
    }

    detectSuspiciousUserAgent(userAgent) {
        const suspiciousPatterns = [
            /bot/i,
            /crawler/i,
            /spider/i,
            /scraper/i,
            /curl/i,
            /wget/i,
            /python/i,
            /java/i,
            /go-http-client/i,
            /postman/i,
            /insomnia/i,
            /^$/,
            /<[^>]*>/ // HTML in user agent
        ];

        return suspiciousPatterns.some(pattern => pattern.test(userAgent));
    }

    validateRequestSize(req) {
        const contentLength = parseInt(req.headers['content-length'] || '0');
        const maxSize = 10 * 1024 * 1024; // 10MB

        return contentLength > maxSize;
    }

    sanitizeObject(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return obj;
        }

        const sanitized = {};

        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                // Trim whitespace
                let sanitizedValue = value.trim();

                // Limit length
                if (sanitizedValue.length > this.securityConfig.validation.maxFieldLength) {
                    sanitizedValue = sanitizedValue.substring(0, this.securityConfig.validation.maxFieldLength);
                }

                // Remove null bytes
                sanitizedValue = sanitizedValue.replace(/\0/g, '');

                // Normalize Unicode
                sanitizedValue = sanitizedValue.normalize('NFC');

                sanitized[key] = sanitizedValue;
            } else if (Array.isArray(value)) {
                sanitized[key] = value.map(item =>
                    typeof item === 'object' ? this.sanitizeObject(item) : item
                );
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }

    addSecurityHeaders(res) {
        // HSTS
        res.setHeader(
            'Strict-Transport-Security',
            `max-age=${this.securityConfig.headers.hsts.maxAge}; includeSubDomains; preload`
        );

        // Content Security Policy
        const csp = this.buildCSP();
        res.setHeader('Content-Security-Policy', csp);

        // X-Frame-Options
        res.setHeader('X-Frame-Options', 'DENY');

        // X-Content-Type-Options
        res.setHeader('X-Content-Type-Options', 'nosniff');

        // Referrer-Policy
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Permissions-Policy
        res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

        // X-XSS-Protection (legacy but still useful)
        res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    buildCSP() {
        const directives = this.securityConfig.headers.csp.directives;
        const cspParts = [];

        for (const [directive, values] of Object.entries(directives)) {
            const directiveName = directive.replace(/([A-Z])/g, '-$1').toLowerCase();
            cspParts.push(`${directiveName} ${values.join(' ')}`);
        }

        return cspParts.join('; ');
    }

    getAllowedOrigins() {
        const origins = process.env.CORS_ORIGINS;
        if (!origins) {return ['http://localhost:3000'];}

        return origins.split(',').map(origin => origin.trim());
    }

    blockIP(ip, duration = 3600000) {
        this.blockedIPs.add(ip);

        setTimeout(() => {
            this.blockedIPs.delete(ip);
        }, duration);

        // Also block in Redis if available
        if (this.redis) {
            this.redis.setex(`blocked_ip:${ip}`, Math.ceil(duration / 1000), '1');
        }
    }

    blockResponse(res, reason) {
        res.status(403).json({
            success: false,
            error: 'ACCESS_DENIED',
            message: 'Your request has been blocked for security reasons',
            code: reason,
            timestamp: new Date().toISOString()
        });
    }

    generateRequestId() {
        return crypto.randomBytes(16).toString('hex');
    }

    logSecurityEvent(event, data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            event,
            ...data
        };

        this.securityLogs.push(logEntry);

        // Keep only last 10000 logs
        if (this.securityLogs.length > 10000) {
            this.securityLogs = this.securityLogs.slice(-10000);
        }

        console.warn(`🛡️ Security Event [${event}]:`, data);
    }

    logRequest(req, responseTime) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.originalUrl,
            ip: this.getClientIP(req),
            userAgent: req.headers['user-agent'],
            responseTime: Math.round(responseTime),
            requestId: req.requestId,
            userId: req.user?.id || 'anonymous'
        };

        this.securityLogs.push(logEntry);
    }

    /**
     * Get security statistics
     */
    getSecurityStats() {
        const now = Date.now();
        const last24h = now - (24 * 60 * 60 * 1000);

        const recentLogs = this.securityLogs.filter(log =>
            new Date(log.timestamp).getTime() > last24h
        );

        const stats = {
            blockedIPs: this.blockedIPs.size,
            suspiciousActivities: this.suspiciousActivities.size,
            securityLogs24h: recentLogs.length,
            threatsDetected: {
                sqlInjection: this.threatDetection.sqlInjection.size,
                xss: this.threatDetection.xss.size,
                pathTraversal: this.threatDetection.pathTraversal.size,
                bruteForce: this.threatDetection.bruteForce.size
            },
            topAttackers: this.getTopAttackers(recentLogs),
            requestStats: this.getRequestStats(recentLogs),
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime()
        };

        return stats;
    }

    getTopAttackers(logs, limit = 10) {
        const ipCounts = {};

        for (const log of logs) {
            if (log.event && log.event.includes('ATTEMPT')) {
                ipCounts[log.ip] = (ipCounts[log.ip] || 0) + 1;
            }
        }

        return Object.entries(ipCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, limit)
            .map(([ip, count]) => ({ ip, count }));
    }

    getRequestStats(logs) {
        const stats = {
            total: logs.length,
            averageResponseTime: 0,
            errorRate: 0,
            topSlowRequests: [],
            statusCodes: {}
        };

        if (logs.length === 0) {return stats;}

        let totalResponseTime = 0;
        let errorCount = 0;

        for (const log of logs) {
            if (log.responseTime) {
                totalResponseTime += log.responseTime;
            }

            if (log.statusCode >= 400) {
                errorCount++;
            }

            stats.statusCodes[log.statusCode] = (stats.statusCodes[log.statusCode] || 0) + 1;
        }

        stats.averageResponseTime = Math.round(totalResponseTime / logs.length);
        stats.errorRate = Math.round((errorCount / logs.length) * 100);

        // Get slow requests
        const slowRequests = logs
            .filter(log => log.responseTime > 1000)
            .sort((a, b) => b.responseTime - a.responseTime)
            .slice(0, 10);

        stats.topSlowRequests = slowRequests.map(log => ({
            url: log.url,
            method: log.method,
            responseTime: log.responseTime,
            statusCode: log.statusCode
        }));

        return stats;
    }

    /**
     * Cleanup method
     */
    async cleanup() {
        if (this.redis) {
            await this.redis.disconnect();
        }

        this.blockedIPs.clear();
        this.suspiciousActivities.clear();
        this.securityLogs = [];
    }
}

// Export singleton instance
export default new AdvancedSecurity();