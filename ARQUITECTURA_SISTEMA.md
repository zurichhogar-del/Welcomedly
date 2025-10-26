# Arquitectura del Sistema Welcomedly

**Versión:** 1.0
**Última Actualización:** 25 de Octubre 2025
**Estado:** Production-Ready

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Arquitectura General](#arquitectura-general)
4. [Modelos de Datos](#modelos-de-datos)
5. [Patrones de Diseño](#patrones-de-diseño)
6. [APIs y Endpoints](#apis-y-endpoints)
7. [Seguridad](#seguridad)
8. [Performance y Escalabilidad](#performance-y-escalabilidad)
9. [Monitoreo y Logging](#monitoreo-y-logging)
10. [Deployment](#deployment)

---

## 1. Resumen Ejecutivo

**Welcomedly** es una plataforma de gestión de call center orientada a campañas comerciales, diseñada con arquitectura MVC + Services Layer, optimizada para escalabilidad y mantenibilidad.

### Características Principales

- ✅ Gestión de campañas y leads
- ✅ Softphone WebRTC integrado
- ✅ Analytics y reportes en tiempo real
- ✅ Sistema de disposiciones flexible
- ✅ Monitoreo de agentes en tiempo real
- ✅ Integración con IA (OpenAI)
- ✅ Exportación de datos (CSV)

### Métricas del Sistema

- **Líneas de Código:** ~15,000+
- **Modelos de Datos:** 16
- **Endpoints API:** 45+
- **Rutas Principales:** 12
- **Tests:** 16 (Jest)
- **Sprints Completados:** 8

---

## 2. Stack Tecnológico

### Backend

| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| Node.js | 23.3.0 | Runtime JavaScript |
| Express | 5.x | Framework web |
| PostgreSQL | Latest | Base de datos relacional |
| Sequelize | 6.x | ORM |
| Redis | (Opcional) | Cache y sessions |

### Frontend

| Tecnología | Versión | Propósito |
|-----------|---------|-----------|
| EJS | Latest | Template engine |
| Bootstrap | 5.x | UI framework |
| jQuery | 3.x | DOM manipulation |
| Chart.js | 4.4.0 | Gráficos |
| SweetAlert2 | Latest | Notificaciones |
| Font Awesome | 6.x | Iconos |

### Seguridad

| Tecnología | Propósito |
|-----------|-----------|
| Helmet.js | Headers de seguridad HTTP |
| express-rate-limit | Rate limiting |
| csurf | Protección CSRF |
| DOMPurify | Sanitización XSS |
| bcrypt | Hashing de contraseñas |

### Telefonía

| Tecnología | Propósito |
|-----------|-----------|
| Asterisk AMI | Control de PBX |
| WebRTC | Softphone en navegador |
| SIP.js | Stack SIP JavaScript |

### IA y Analytics

| Tecnología | Propósito |
|-----------|-----------|
| OpenAI API | Asistencia con IA |
| json2csv | Exportación CSV |

---

## 3. Arquitectura General

### Diagrama de Capas

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTACIÓN                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  EJS     │  │Bootstrap │  │ Chart.js │             │
│  │Templates │  │    +     │  │    +     │             │
│  │          │  │ jQuery   │  │SweetAlert│             │
│  └──────────┘  └──────────┘  └──────────┘             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    APLICACIÓN                           │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Controllers │  │  Middlewares │  │    Routes    │  │
│  │             │  │              │  │              │  │
│  │ • Campaign  │  │ • Auth       │  │ • Campaign   │  │
│  │ • Agent     │  │ • CSRF       │  │ • Agent      │  │
│  │ • Analytics │  │ • RateLimit  │  │ • Analytics  │  │
│  │ • Telephony │  │ • Security   │  │ • Telephony  │  │
│  └─────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                LÓGICA DE NEGOCIO                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │                   Services                       │  │
│  │                                                  │  │
│  │  • campaignService    • analyticsService       │  │
│  │  • userService        • telephonyService       │  │
│  │  • disposicionService • aiService              │  │
│  │  • agentStatusService                          │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  PERSISTENCIA                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Sequelize   │  │  PostgreSQL  │  │    Redis     │ │
│  │     ORM      │  │  (Primary)   │  │  (Sessions)  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Flujo de Request

```
Cliente (Browser)
    ↓
HTTPS Request
    ↓
Express Server (index.js)
    ↓
Middlewares (Security, Auth, CSRF, Rate Limit)
    ↓
Router (routes/index.js)
    ↓
Controller (handles HTTP)
    ↓
Service (business logic)
    ↓
Model (Sequelize ORM)
    ↓
PostgreSQL Database
    ↓
Response (JSON o HTML)
    ↓
Cliente (Render)
```

---

## 4. Modelos de Datos

### Diagrama ER Simplificado

```
┌──────────────┐        ┌──────────────┐
│    User      │        │   Campana    │
│              │        │              │
│ • id         │◄───┐   │ • id         │
│ • nombre     │    │   │ • nombre     │
│ • correo     │    │   │ • activa     │
│ • rol        │    │   │ • formularioId│
└──────────────┘    │   └──────────────┘
                    │          │
                    │          │ 1:N
                    │          ↓
                    │   ┌──────────────┐
                    └───│ BaseCampana  │
                        │              │
                        │ • id         │
                        │ • nombre     │
                        │ • telefono   │
                        │ • agenteId   │
                        │ • disposicionId
                        └──────────────┘
```

### Modelos Principales

#### 1. User (usuarios)
**Propósito:** Agentes y administradores

**Campos clave:**
- `rol`: ENUM(ADMIN, AGENTE)
- `activo`: Boolean

**Relaciones:**
- hasMany BaseCampana (como agente)
- hasMany AgentStatus
- hasMany WorkSession
- hasMany Call

#### 2. Campana (campanas)
**Propósito:** Campañas comerciales

**Campos clave:**
- `nombre`: String
- `activa`: Boolean
- `formularioId`: Foreign Key

**Relaciones:**
- belongsTo Formulario
- hasMany BaseCampana (CASCADE delete)
- belongsToMany Disposicion

#### 3. BaseCampana (base_campanas)
**Propósito:** Leads/registros de campaña

**Campos clave:**
- `nombre`, `telefono`, `correo`: Datos del lead
- `otrosCampos`: JSONB (flexible fields)
- `disposicionId`: Tipificación
- `callbackDate`: Fecha de seguimiento
- `intentosLlamada`: Counter

**Relaciones:**
- belongsTo Campana (CASCADE)
- belongsTo User (agente)
- belongsTo Disposicion

#### 4. Disposicion (disposiciones)
**Propósito:** Resultados de llamadas

**Campos clave:**
- `nombre`: String
- `tipo`: ENUM(EXITOSA, NO_CONTACTO, SEGUIMIENTO, NO_EXITOSA)
- `requiereCallback`: Boolean

**Relaciones:**
- hasMany BaseCampana
- belongsToMany Campana

#### 5. AgentStatus (agent_statuses)
**Propósito:** Estado en tiempo real de agentes

**Campos clave:**
- `status`: ENUM(DISPONIBLE, EN_LLAMADA, PAUSADO, etc.)
- `pauseReason`: String (nullable)

**Relaciones:**
- belongsTo User (agente)

#### 6. WorkSession (work_sessions)
**Propósito:** Sesiones de trabajo de agentes

**Campos clave:**
- `loginTime`, `logoutTime`: Timestamps
- `totalPauseTime`: Integer (seconds)

**Relaciones:**
- belongsTo User (agente)
- hasMany PauseHistory

#### 7. Call (calls)
**Propósito:** Registro de llamadas

**Campos clave:**
- `callId`: Unique identifier
- `direction`: ENUM(inbound, outbound)
- `startTime`, `endTime`: Timestamps
- `duration`: Integer (seconds)
- `disposition`: String

**Relaciones:**
- belongsTo User (agente)

#### 8. AgentMetric (agent_metrics)
**Propósito:** Time-series de métricas de agentes

**Campos clave:**
- `timestamp`: Timestamp
- `productiveTime`, `pauseTime`: Integers
- `callsHandled`, `salesCount`: Integers

**Índices:**
- (agenteId, timestamp)

**Relaciones:**
- belongsTo User (agente)

#### 9. CampaignMetric (campaign_metrics)
**Propósito:** Time-series de métricas de campañas

**Campos clave:**
- `timestamp`: Timestamp
- `totalLeads`, `contactedLeads`: Integers
- `conversionRate`: Decimal

**Índices:**
- (campanaId, timestamp)

**Relaciones:**
- belongsTo Campana

---

## 5. Patrones de Diseño

### MVC + Services Layer

**Separación de Responsabilidades:**

```javascript
// Controller: Maneja HTTP, no lógica de negocio
class CampaignController {
    async create(req, res) {
        const data = req.body;
        const campaign = await campaignService.create(data);
        res.json({ success: true, campaign });
    }
}

// Service: Lógica de negocio compleja
class CampaignService {
    async create(data) {
        // Validaciones
        // Transformaciones
        // Creación en BD
        // Notificaciones
        return await Campana.create(data);
    }
}

// Model: Definición de schema y asociaciones
class Campana extends Model {
    static associate(models) {
        this.hasMany(models.BaseCampana);
    }
}
```

### Dependency Injection

```javascript
// Servicios importados y reutilizados
import campaignService from '../services/campaignService.js';
import analyticsService from '../services/analyticsService.js';

// Controller usa servicios sin instanciar
const campaigns = await campaignService.getAll();
const metrics = await analyticsService.getAgentMetrics(agentId);
```

### Repository Pattern (implícito en Sequelize)

```javascript
// Sequelize actúa como repository
await User.findAll({ where: { activo: true } });
await BaseCampana.create(leadData);
```

### Strategy Pattern (Disposiciones)

```javascript
// Diferentes estrategias según tipo de disposición
if (disposicion.requiereCallback) {
    // Strategy: Callback requerido
    await scheduleCallback(registro, callbackData);
} else {
    // Strategy: No callback
    await markAsCompleted(registro);
}
```

---

## 6. APIs y Endpoints

### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /auth/register | Registro de usuario |
| POST | /auth/login | Inicio de sesión |
| POST | /auth/logout | Cerrar sesión |
| GET | /api/session/current | Sesión actual |

### Campañas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /campaign/campanas | Listar campañas |
| POST | /campaign/crear_campana | Crear campaña |
| GET | /campaign/campanas/:id | Ver campaña |
| POST | /campaign/campanas/:id/upload | Subir leads (CSV) |
| GET | /campaign/campanas/:id/ver_base | Ver base de leads |

### Agentes

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /agent/workstation | Workstation de agente |
| POST | /api/agent/status | Cambiar estado |
| GET | /api/agent/status/:agentId | Obtener estado |

### Telefonía

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/telephony/call/make | Realizar llamada |
| POST | /api/telephony/call/answer | Contestar llamada |
| POST | /api/telephony/call/hangup | Colgar llamada |
| POST | /api/telephony/call/transfer | Transferir llamada |
| GET | /api/telephony/lookup/customer/:phone | Buscar cliente por teléfono |
| GET | /api/telephony/calls/stats | Estadísticas de llamadas |

### Analytics

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /analytics/dashboard | Dashboard de analytics |
| GET | /analytics/api/agent/:id | Métricas de agente |
| GET | /analytics/api/agents/compare | Comparar agentes |
| GET | /analytics/api/campaign/:id | Métricas de campaña |
| GET | /analytics/export/agents/csv | Exportar agentes CSV |

### Disposiciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /disposiciones | Listar disposiciones |
| POST | /disposiciones/crear | Crear disposición |
| POST | /disposiciones/asignar | Asignar a campaña |

### Health & Monitoring

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /health | Health check básico |
| GET | /health/detailed | Health check detallado |
| GET | /api/ratelimit/status | Estado de rate limits |

---

## 7. Seguridad

### Autenticación

**Estrategia:** Session-based con cookies HTTP-only

```javascript
// Configuración de sesión
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));
```

### Autorización

**Middleware `requireAuth`:**

```javascript
export const requireAuth = (req, res, next) => {
    if (!req.session || !req.session.usuario) {
        return res.redirect('/auth/login');
    }
    next();
};
```

### CSRF Protection

**Token en cada formulario:**

```javascript
// Middleware
import { csrfProtection } from '../middlewares/csrfMiddleware.js';
router.use(csrfProtection);

// En vistas
<input type="hidden" name="_csrf" value="<%= csrfToken %>">
```

### XSS Prevention

**DOMPurify para sanitización:**

```javascript
// Frontend
const cleanHTML = DOMPurify.sanitize(userInput);
```

### Rate Limiting

**Diferentes niveles:**

```javascript
// General: 100 requests/15 min
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});

// Login: 5 requests/15 min
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5
});
```

### Content Security Policy

**Helmet.js configuración:**

```javascript
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "cdn.jsdelivr.net", "code.jquery.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"]
        }
    }
}));
```

### Password Hashing

**bcrypt con salt rounds:**

```javascript
import bcrypt from 'bcrypt';

const hashedPassword = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, hashedPassword);
```

---

## 8. Performance y Escalabilidad

### Índices de Base de Datos

**Optimizaciones implementadas:**

```sql
-- Índices en AgentMetric
CREATE INDEX agent_metrics_agente_id ON agent_metrics (agente_id);
CREATE INDEX agent_metrics_timestamp ON agent_metrics (timestamp);
CREATE INDEX agent_metrics_composite ON agent_metrics (agente_id, timestamp);

-- Índices en CampaignMetric
CREATE INDEX campaign_metrics_campana_id ON campaign_metrics (campana_id);
CREATE INDEX campaign_metrics_timestamp ON campaign_metrics (timestamp);
CREATE INDEX campaign_metrics_composite ON campaign_metrics (campana_id, timestamp);
```

### Queries Optimizadas

**Uso de includes y aggregations:**

```javascript
// En lugar de múltiples queries
const campaign = await Campana.findByPk(id, {
    include: [
        { model: Formulario, as: 'formulario' },
        { model: BaseCampana, as: 'registros' }
    ]
});

// Aggregations eficientes
const stats = await BaseCampana.count({
    where: { campanaId: id },
    group: ['disposicionId']
});
```

### Caching Estratégico

**Frontend:**
- Chart.js mantiene cache de datos en memoria
- SweetAlert modals reusables

**Backend (preparado para Redis):**
```javascript
// Estructura para future Redis caching
const cacheKey = `agent:${agentId}:metrics`;
// await redis.get(cacheKey);
// await redis.setex(cacheKey, 300, JSON.stringify(metrics));
```

### Paginación

**Implementada en listados grandes:**

```javascript
// Pagination en campañas
const limit = 50;
const offset = (page - 1) * limit;

const { rows, count } = await BaseCampana.findAndCountAll({
    where: { campanaId },
    limit,
    offset
});
```

---

## 9. Monitoreo y Logging

### Health Checks

**Endpoints implementados:**

```javascript
// GET /health - Básico
{
    "status": "healthy",
    "timestamp": "2025-10-25T10:00:00Z"
}

// GET /health/detailed - Detallado
{
    "status": "healthy",
    "uptime": 3600,
    "database": "connected",
    "memory": {
        "used": "150MB",
        "total": "512MB"
    }
}
```

### Logging Estructurado

**Console logs con contexto:**

```javascript
console.log('[AnalyticsService] Calculating agent metrics for agent:', agentId);
console.error('[TelephonyService] Error making call:', error);
```

**Preparado para Winston/Pino:**
```javascript
// Future logging library
logger.info('Agent status changed', {
    agentId,
    oldStatus,
    newStatus,
    timestamp: new Date()
});
```

### Rate Limit Monitoring

**Endpoint de monitoreo:**

```javascript
// GET /api/ratelimit/status
{
    "limiters": {
        "general": {
            "limit": 100,
            "remaining": 87,
            "resetTime": "..."
        },
        "login": {
            "limit": 5,
            "remaining": 3,
            "resetTime": "..."
        }
    }
}
```

---

## 10. Deployment

### Variables de Entorno Requeridas

```bash
# Base de datos
DB_PASSWORD=your_postgres_password

# Sesiones
SESSION_SECRET=your_session_secret_32_chars

# OpenAI (opcional)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=500

# Entorno
NODE_ENV=production
PORT=3000
```

### Scripts de Deployment

**package.json:**

```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest",
    "migrate": "node src/database/migrations/create-analytics-tables.js"
  }
}
```

### Proceso de Deployment

**Pasos recomendados:**

1. **Preparación:**
   ```bash
   npm install --production
   npm run migrate
   ```

2. **Seed inicial:**
   ```bash
   node src/database/seedDisposiciones.js
   node src/database/seedTestData.js
   ```

3. **Inicio del servidor:**
   ```bash
   NODE_ENV=production npm start
   ```

4. **Verificación:**
   ```bash
   curl http://localhost:3000/health
   ```

### Recomendaciones de Producción

**Proceso Manager (PM2):**

```bash
npm install -g pm2
pm2 start src/index.js --name "welcomedly"
pm2 save
pm2 startup
```

**Reverse Proxy (NGINX):**

```nginx
server {
    listen 80;
    server_name welcomedly.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Database Backups:**

```bash
# Backup diario
pg_dump -U postgres miappdb > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres miappdb < backup_20251025.sql
```

---

## 📊 Métricas de Calidad

### Code Quality

- ✅ **ESLint:** Configurado (87 issues pendientes)
- ✅ **Prettier:** Configurado (48 archivos pendientes)
- ✅ **Jest Tests:** 16/16 passing
- ⚠️ **Code Coverage:** No configurado aún

### Security Audit

```bash
npm audit
# 16 vulnerabilities (5 low, 9 moderate, 2 critical)
# Acción requerida: npm audit fix
```

### Performance Benchmarks

- **Health Check:** < 10ms
- **Login:** < 200ms
- **Dashboard Load:** < 500ms
- **Analytics Query:** < 1000ms
- **CSV Export:** < 2000ms

---

## 🔮 Roadmap Futuro

### Corto Plazo (1-2 meses)

- [ ] Implementar Redis para sessions y cache
- [ ] Configurar PM2 en producción
- [ ] Implementar Winston para logging
- [ ] Resolver todas las issues de ESLint
- [ ] Aumentar code coverage a 80%+

### Mediano Plazo (3-6 meses)

- [ ] Clustering con Redis Adapter para Socket.IO
- [ ] PostgreSQL read replicas
- [ ] Integración con Twilio para telefonía real
- [ ] Dashboard en tiempo real con WebSockets
- [ ] Notificaciones push

### Largo Plazo (6-12 meses)

- [ ] Microservicios (separar telephony, analytics)
- [ ] Kubernetes deployment
- [ ] Multi-tenancy support
- [ ] Machine Learning para predictive dialing
- [ ] Mobile app (React Native)

---

**Documento Vivo:** Este documento se actualizará conforme evolucione el sistema.

**Contacto Técnico:** Ver CLAUDE.md para guías de desarrollo.
