import { Router } from "express";

import authRoutes from './authRoutes.js'
import campaignsRoutes from './campaignsRoutes.js'
import marketRoutes from './marketRoutes.js'
import chatRoutes from './chatRoutes.js'
import reportsRoutes from './reportsRoutes.js'
import agentsRoutes from './agentsRoutes.js'
import disposicionesRoutes from './disposicionesRoutes.js'
import aiRoutes from './aiRoutes.js'
// import aiEnhancedRoutes from './aiEnhancedRoutes.js' // ❌ COMENTADO: Archivo no existe
import agentStatusRoutes from './agentStatusRoutes.js'
// import predictiveDialerRoutes from './predictiveDialerRoutes.js' // ⚠️ COMENTADO: Dependencias faltantes
// import qualityManagementRoutes from './qualityManagementRoutes.js' // ⚠️ COMENTADO: Dependencias faltantes
// import advancedAnalyticsRoutes from './advancedAnalyticsRoutes.js' // ⚠️ COMENTADO: Dependencias faltantes
// import gamificationRoutes from './gamificationRoutes.js' // ⚠️ COMENTADO: Errores de sintaxis en servicio
import healthRoutes from './healthRoutes.js' // ✅ Sprint 2.2.2: Health Check Endpoints
import rateLimitRoutes from './rateLimitRoutes.js' // ✅ Sprint 2.4.3: Rate Limit Monitoring
import componentsRoutes from './componentsRoutes.js' // ✅ Sprint 3.0: Components Showcase
import telephonyRoutes from './telephonyRoutes.js' // ✅ Sprint 3.1.3: Telephony API
import analyticsRoutes from './analyticsRoutes.js' // ✅ Sprint 3.3: Analytics y Reportes
import trunkRoutes from './trunkRoutes.js' // ✅ Sprint 3.1.6: Trunk Management
import { csrfProtection } from '../middlewares/csrfMiddleware.js'
import logger from '../utils/logger.js' // Para CSP report logging

// Importar authJwtRoutes (comentado temporalmente hasta que esté implementado)
// import authJwtRoutes from './authJwtRoutes.js' 

const router = Router();

// Ruta raíz - landing page
router.get("/", (req, res) => {
    try {
        console.log('Accediendo a ruta raíz');
        if (req.session && req.session.usuario) {
            console.log('Usuario autenticado, redirigiendo a market');
            return res.redirect('/market/market');
        }
        console.log('Renderizando landing page');
        res.render('landing', {
            layout: false,
            title: 'Welcomedly - Plataforma de Gestión de Call Center'
        });
    } catch (error) {
        console.error('Error en ruta raíz:', error);
        res.status(500).send(`Error interno del servidor: ${ error.message}`);
    }
});

// Rutas de autenticación (antes de CSRF protection)
router.use("/auth", authRoutes)
// router.use("/api/auth", authJwtRoutes) // Comentado temporalmente

// Health Check Endpoints (sin CSRF para herramientas de monitoreo)
router.use(healthRoutes) // ✅ Sprint 2.2.2: /health y /health/detailed

// Rate Limit Monitoring Endpoints (sin CSRF para APIs)
router.use("/api/ratelimit", rateLimitRoutes) // ✅ Sprint 2.4.3: Rate limit monitoring

// CSP Violation Report Endpoint - MEJORA #5 (100/100)
// Recibe reportes de violaciones de Content Security Policy del navegador
router.post("/api/csp-report", (req, res) => {
    const violation = req.body;

    logger.warn('CSP Violation Reported', {
        documentUri: violation['document-uri'] || violation.documentUri,
        violatedDirective: violation['violated-directive'] || violation.violatedDirective,
        blockedUri: violation['blocked-uri'] || violation.blockedUri,
        sourceFile: violation['source-file'] || violation.sourceFile,
        lineNumber: violation['line-number'] || violation.lineNumber,
        columnNumber: violation['column-number'] || violation.columnNumber,
        userAgent: req.get('user-agent'),
        ip: req.ip,
        timestamp: new Date().toISOString()
    });

    // Responder con 204 No Content (estándar para CSP reports)
    res.status(204).end();
});

// Endpoint para obtener sesión actual (sin CSRF)
router.get("/api/session/current", (req, res) => {
    if (req.session && req.session.usuario) {
        res.json({
            success: true,
            usuario: {
                id: req.session.usuario.id,
                nombre: req.session.usuario.nombre,
                correo: req.session.usuario.correo,
                rol: req.session.usuario.rol
            }
        });
    } else {
        res.status(401).json({
            success: false,
            message: 'No hay sesión activa'
        });
    }
});

// Aplicar protección CSRF a todas las rutas excepto autenticación
router.use("/chat", chatRoutes)
router.use(csrfProtection); // Middleware CSRF para las siguientes rutas
router.use("/market", marketRoutes)
router.use("/campaign", campaignsRoutes)
router.use("/reports", reportsRoutes)
router.use("/agents", agentsRoutes)
router.use("/disposiciones", disposicionesRoutes)
router.use("/ai", aiRoutes)
router.use("/components", componentsRoutes) // ✅ Sprint 3.0: Components Showcase
router.use("/api/telephony", telephonyRoutes) // ✅ Sprint 3.1.3: Telephony API
router.use("/analytics", analyticsRoutes) // ✅ Sprint 3.3: Analytics y Reportes
router.use("/trunks", trunkRoutes) // ✅ Sprint 3.1.6: Trunk Management
// router.use("/api/ai", aiEnhancedRoutes) // ❌ COMENTADO: Archivo no existe
router.use("/api/agent", agentStatusRoutes)
// router.use("/api/dialer", predictiveDialerRoutes) // ⚠️ COMENTADO: Dependencias faltantes
// router.use("/api/quality", qualityManagementRoutes) // ⚠️ COMENTADO: Dependencias faltantes
// router.use("/api/analytics", advancedAnalyticsRoutes) // ⚠️ COMENTADO: Dependencias faltantes
// router.use("/api/gamification", gamificationRoutes) // ⚠️ COMENTADO: Errores de sintaxis

export default router;