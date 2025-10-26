# Sistema de Telefonía Welcomedly - Documentación Técnica Completa

## Sprint 3.1 - Integración Asterisk/FreePBX + WebRTC

**Versión:** 1.0.0
**Fecha:** Octubre 2025
**Estado:** Implementado (Backend completo, Frontend pendiente)

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Modelos de Base de Datos](#modelos-de-base-de-datos)
4. [Servicios Backend](#servicios-backend)
5. [API REST](#api-rest)
6. [Flujos de Trabajo](#flujos-de-trabajo)
7. [Configuración](#configuración)
8. [Testing](#testing)
9. [Deployment](#deployment)
10. [Roadmap](#roadmap)

---

## 1. Resumen Ejecutivo

El sistema de telefonía de Welcomedly proporciona capacidades completas de call center profesional mediante la integración de **Asterisk/FreePBX** con **WebRTC**. Permite realizar y recibir llamadas en tiempo real, gestionar múltiples troncales SIP, y monitorear toda la actividad telefónica.

### Características Principales

✅ **Gestión de Llamadas**
- Originación de llamadas salientes vía AMI
- Registro automático de CDR (Call Detail Records)
- Cálculo de duración y tiempos de facturación
- Asociación con agente, campaña, lead y troncal

✅ **Gestión de Troncales SIP**
- Soporte para múltiples proveedores (Twilio, Vonage, Bandwidth, Custom)
- Enrutamiento inteligente por prioridad
- Failover automático en caso de fallo
- Control de capacidad (max_channels)
- Monitoreo de estado en tiempo real
- Estadísticas por troncal

✅ **Gestión de SIP Peers**
- Creación automática de cuentas SIP para agentes
- Generación de extensiones únicas
- Monitoreo de estado de registro
- Integración con WebRTC

✅ **Integración AMI (Asterisk Manager Interface)**
- Conexión persistente con keepalive
- Escucha de eventos en tiempo real
- Control de llamadas activas
- Sincronización de estados

---

## 2. Arquitectura del Sistema

### 2.1 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    WELCOMEDLY PLATFORM                       │
│                                                               │
│  ┌────────────────┐         ┌────────────────┐              │
│  │  Agent Browser │         │  Agent Browser │              │
│  │   (WebRTC)     │         │   (WebRTC)     │              │
│  └───────┬────────┘         └────────┬───────┘              │
│          │                            │                       │
│          │ WSS (WebSocket Secure)     │                       │
│          │                            │                       │
│  ┌───────▼────────────────────────────▼───────┐              │
│  │         Node.js Express Server             │              │
│  │  ┌──────────────────────────────────────┐  │              │
│  │  │   TelephonyService (AMI Client)      │  │              │
│  │  │   - Event Listener                   │  │              │
│  │  │   - Call Control                     │  │              │
│  │  │   - State Management                 │  │              │
│  │  └──────────────────────────────────────┘  │              │
│  │  ┌──────────────────────────────────────┐  │              │
│  │  │   REST API (TelephonyController)     │  │              │
│  │  │   - /api/telephony/*                 │  │              │
│  │  └──────────────────────────────────────┘  │              │
│  │  ┌──────────────────────────────────────┐  │              │
│  │  │   Database Models                    │  │              │
│  │  │   - Call, SipPeer, Trunk             │  │              │
│  │  └──────────────────────────────────────┘  │              │
│  └────────────┬───────────────────────────────┘              │
│               │                                               │
└───────────────┼───────────────────────────────────────────────┘
                │
                │ AMI Protocol (Port 5038)
                │
        ┌───────▼───────────────────────────┐
        │   ASTERISK PBX SERVER             │
        │                                    │
        │  ┌──────────────────────────────┐ │
        │  │  Chan_PJSIP (WebRTC)         │ │
        │  │  - WSS Transport :8089       │ │
        │  │  - SIP Peers (Agents)        │ │
        │  └──────────────────────────────┘ │
        │  ┌──────────────────────────────┐ │
        │  │  Dialplan (Extensions)       │ │
        │  │  - Inbound Context           │ │
        │  │  - Outbound Context          │ │
        │  └──────────────────────────────┘ │
        │  ┌──────────────────────────────┐ │
        │  │  Trunks (Outbound)           │ │
        │  │  - Twilio SIP Trunk          │ │
        │  │  - Vonage SIP Trunk          │ │
        │  │  - Custom Trunks             │ │
        │  └──────────────────────────────┘ │
        │  ┌──────────────────────────────┐ │
        │  │  CDR & Recording             │ │
        │  │  - MixMonitor                │ │
        │  └──────────────────────────────┘ │
        └────────────┬───────────────────────┘
                     │
                     │ SIP Protocol
                     │
        ┌────────────▼───────────────┐
        │   SIP TRUNK PROVIDERS      │
        │   - Twilio                 │
        │   - Vonage                 │
        │   - Bandwidth              │
        │   - Custom/Local PSTN      │
        └────────────────────────────┘
```

### 2.2 Stack Tecnológico

**Backend (PBX):**
- Asterisk 20+
- FreePBX 17 (opcional)
- Chan_PJSIP
- WebRTC
- Coturn (STUN/TURN)

**Backend (Application):**
- Node.js + Express 5
- PostgreSQL 14+
- Sequelize ORM
- asterisk-manager (npm)
- WebSocket (ws)

**Frontend (Pendiente Sprint 3.1.4):**
- SIP.js 0.21+
- WebRTC APIs
- Modern UI Components

---

## 3. Modelos de Base de Datos

### 3.1 Tabla `trunks` - Troncales SIP

Almacena la configuración de troncales SIP para llamadas salientes.

```sql
CREATE TABLE trunks (
    id SERIAL PRIMARY KEY,

    -- Identificación
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    provider ENUM('twilio', 'vonage', 'bandwidth', 'custom') NOT NULL,
    trunk_type ENUM('sip', 'iax2', 'pjsip') NOT NULL DEFAULT 'pjsip',

    -- Configuración SIP
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL DEFAULT 5060,
    username VARCHAR(100),
    password VARCHAR(255),
    from_user VARCHAR(100),
    from_domain VARCHAR(255),

    -- Capacidad y Enrutamiento
    max_channels INTEGER NOT NULL DEFAULT 10,
    priority INTEGER NOT NULL DEFAULT 10,

    -- Estado
    status ENUM('active', 'inactive', 'maintenance', 'error') NOT NULL DEFAULT 'active',
    registered BOOLEAN NOT NULL DEFAULT false,
    last_registered_at TIMESTAMPTZ,
    last_error_at TIMESTAMPTZ,
    last_error_message TEXT,

    -- Estadísticas
    total_calls INTEGER NOT NULL DEFAULT 0,
    successful_calls INTEGER NOT NULL DEFAULT 0,
    failed_calls INTEGER NOT NULL DEFAULT 0,

    -- Configuración Avanzada
    advanced_settings JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE UNIQUE INDEX idx_trunks_name ON trunks(name);
CREATE INDEX idx_trunks_status_registered ON trunks(status, registered);
CREATE INDEX idx_trunks_priority_status ON trunks(priority, status);
CREATE INDEX idx_trunks_provider ON trunks(provider);
```

**Campos Clave:**
- `priority`: 1 = máxima prioridad, 100 = mínima (se usa número más bajo primero)
- `max_channels`: Límite de llamadas concurrentes
- `registered`: Estado actual de registro con el proveedor
- `advanced_settings`: JSONB para codecs, DTMF, NAT, etc.

**Ejemplo de Registro:**
```javascript
{
    name: 'Twilio Main',
    provider: 'twilio',
    host: 'sip.twilio.com',
    port: 5060,
    username: 'AC1234567890abcdef',
    password: 'your_auth_token',
    from_user: '+15551234567',
    max_channels: 20,
    priority: 1,
    status: 'active'
}
```

### 3.2 Tabla `sip_peers` - Cuentas SIP de Agentes

Almacena credenciales SIP para los agentes del call center.

```sql
CREATE TABLE sip_peers (
    id SERIAL PRIMARY KEY,

    -- Asociación
    user_id INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,

    -- Credenciales SIP
    sip_username VARCHAR(50) NOT NULL UNIQUE,
    sip_password VARCHAR(255) NOT NULL,
    extension VARCHAR(20) NOT NULL UNIQUE,

    -- Estado
    status ENUM('active', 'inactive', 'disabled') NOT NULL DEFAULT 'active',
    registered BOOLEAN NOT NULL DEFAULT false,
    last_registered_at TIMESTAMPTZ,

    -- Información de Conexión
    user_agent VARCHAR(255),
    ip_address VARCHAR(45),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE UNIQUE INDEX idx_sip_peers_username ON sip_peers(sip_username);
CREATE UNIQUE INDEX idx_sip_peers_extension ON sip_peers(extension);
CREATE INDEX idx_sip_peers_status_registered ON sip_peers(status, registered);
```

**Generación Automática:**
- `sip_username`: Generado a partir de nombre + apellido (ej: "johndoe")
- `extension`: Auto-incrementado desde 1001
- `sip_password`: Hash bcrypt de contraseña aleatoria

**Ejemplo de Registro:**
```javascript
{
    user_id: 5,
    sip_username: 'johndoe',
    sip_password: '$2b$10$...', // hashed
    extension: '1001',
    status: 'active',
    registered: true
}
```

### 3.3 Tabla `calls` - Registros de Llamadas (CDR)

Almacena el Call Detail Record de todas las llamadas.

```sql
CREATE TABLE calls (
    id SERIAL PRIMARY KEY,

    -- Identificación
    call_id VARCHAR(255) NOT NULL UNIQUE, -- Asterisk UniqueID

    -- Asociaciones
    agent_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    campaign_id INTEGER REFERENCES campanas(id) ON DELETE SET NULL,
    lead_id INTEGER REFERENCES base_campanas(id) ON DELETE SET NULL,
    trunk_id INTEGER REFERENCES trunks(id) ON DELETE SET NULL,

    -- Detalles de Llamada
    direction ENUM('inbound', 'outbound') NOT NULL,
    caller_number VARCHAR(50),
    callee_number VARCHAR(50),

    -- Tiempos
    start_time TIMESTAMPTZ NOT NULL,
    answer_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration INTEGER DEFAULT 0,      -- Total seconds
    billsec INTEGER DEFAULT 0,       -- Billable seconds (after answer)

    -- Resultado
    disposition ENUM('ANSWERED', 'NO ANSWER', 'BUSY', 'FAILED', 'CANCELLED'),
    recording_url VARCHAR(500),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE UNIQUE INDEX idx_calls_call_id ON calls(call_id);
CREATE INDEX idx_calls_agent_starttime ON calls(agent_id, start_time);
CREATE INDEX idx_calls_campaign_disposition ON calls(campaign_id, disposition);
CREATE INDEX idx_calls_lead_id ON calls(lead_id);
CREATE INDEX idx_calls_trunk_id ON calls(trunk_id);
```

**Cálculos:**
- `duration` = end_time - start_time (segundos totales)
- `billsec` = end_time - answer_time (segundos facturables)

**Disposiciones:**
- `ANSWERED`: Llamada contestada exitosamente
- `NO ANSWER`: No contestó
- `BUSY`: Línea ocupada
- `FAILED`: Fallo técnico
- `CANCELLED`: Cancelada antes de completarse

### 3.4 Tabla `campaign_trunks` - Relación Many-to-Many

Asigna troncales específicas a campañas con prioridades personalizadas.

```sql
CREATE TABLE campaign_trunks (
    id SERIAL PRIMARY KEY,
    campana_id INTEGER NOT NULL REFERENCES campanas(id) ON DELETE CASCADE,
    trunk_id INTEGER NOT NULL REFERENCES trunks(id) ON DELETE CASCADE,
    priority INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(campana_id, trunk_id)
);
```

---

## 4. Servicios Backend

### 4.1 TelephonyService

**Ubicación:** `src/services/telephonyService.js`

Servicio singleton que gestiona la conexión AMI con Asterisk y coordina todas las operaciones telefónicas.

#### 4.1.1 Inicialización

```javascript
import telephonyService from '../services/telephonyService.js';

// En src/index.js o al iniciar el servidor
await telephonyService.initialize();
```

#### 4.1.2 Eventos AMI Escuchados

| Evento AMI | Handler | Descripción |
|------------|---------|-------------|
| `newchannel` | `handleNewChannel` | Nueva llamada creada |
| `newstate` | `handleNewState` | Cambio de estado de canal |
| `dial` | `handleDial` | Evento de marcado |
| `bridge` | `handleBridge` | Llamada conectada (bridge) |
| `hangup` | `handleHangup` | Llamada finalizada |
| `peerstatus` | `handlePeerStatus` | Cambio de estado SIP peer |
| `registry` | `handleRegistry` | Cambio en registro de troncal |

#### 4.1.3 Métodos Principales

**Originar Llamada:**
```javascript
const result = await telephonyService.originateCall({
    agentExtension: '1001',
    customerPhone: '+1234567890',
    campaignId: 1,
    leadId: 123,
    agentId: 5
});

// Retorna:
// {
//     success: true,
//     callId: 'WLCM-1635789123456-abc123',
//     trunk: 'Twilio Main',
//     call: Call { ... }
// }
```

**Colgar Llamada:**
```javascript
await telephonyService.hangupCall('PJSIP/1001-00000001');
```

**Obtener Estadísticas:**
```javascript
const stats = telephonyService.getStatistics();
// {
//     connected: true,
//     activeCalls: 3,
//     callsInProgress: 2
// }
```

#### 4.1.4 Eventos Emitidos

El servicio es un EventEmitter que emite eventos internos:

```javascript
telephonyService.on('ami:connected', () => {
    console.log('AMI connected');
});

telephonyService.on('call:new', (callData) => {
    console.log('New call:', callData.callId);
});

telephonyService.on('call:answered', (callData) => {
    console.log('Call answered:', callData.callId);
});

telephonyService.on('call:hangup', (callData) => {
    console.log('Call ended:', callData.callId, callData.disposition);
});

telephonyService.on('trunk:registry', ({ trunk, status }) => {
    console.log(`Trunk ${trunk.name} registration: ${status}`);
});
```

### 4.2 Lógica de Enrutamiento de Llamadas

#### Algoritmo de Selección de Troncal

1. **Consultar troncales disponibles:**
   ```sql
   SELECT * FROM trunks
   WHERE status = 'active' AND registered = true
   ORDER BY priority ASC
   ```

2. **Para cada troncal (en orden de prioridad):**
   - Contar llamadas activas actuales
   - Si `currentCalls < maxChannels`, seleccionar esta troncal
   - Si no, pasar a la siguiente

3. **Si ninguna troncal disponible:**
   - Retornar error "No trunks available"
   - Registrar en logs para alerta

**Código:**
```javascript
// En Trunk model
static async getBestAvailable() {
    const trunks = await this.getAvailable(); // Status=active, registered=true

    for (const trunk of trunks) {
        const currentCalls = await Call.count({
            where: {
                trunkId: trunk.id,
                endTime: null // Llamadas activas
            }
        });

        if (currentCalls < trunk.maxChannels) {
            return trunk;
        }
    }

    return null; // No hay troncales con capacidad
}
```

---

## 5. API REST

### 5.1 Endpoints Disponibles

**Base URL:** `/api/telephony`
**Autenticación:** Requerida (session-based)
**Rate Limiting:** Aplicado

#### 5.1.1 Control de Llamadas

**POST /api/telephony/call/originate**

Origina una llamada saliente.

```javascript
// Request
POST /api/telephony/call/originate
Content-Type: application/json

{
    "agentExtension": "1001",
    "customerPhone": "+1234567890",
    "campaignId": 1,
    "leadId": 123
}

// Response (200 OK)
{
    "success": true,
    "message": "Call originated successfully",
    "data": {
        "callId": "WLCM-1635789123456-abc123",
        "trunk": "Twilio Main",
        "call": {
            "id": 456,
            "callId": "WLCM-1635789123456-abc123",
            "direction": "outbound",
            "startTime": "2025-10-25T10:30:00Z"
        }
    }
}
```

**POST /api/telephony/call/hangup**

Cuelga una llamada activa.

```javascript
// Request
POST /api/telephony/call/hangup
Content-Type: application/json

{
    "channel": "PJSIP/1001-00000001"
}

// Response (200 OK)
{
    "success": true,
    "message": "Call hung up successfully"
}
```

#### 5.1.2 Información de Llamadas

**GET /api/telephony/calls/active**

Obtiene todas las llamadas activas.

```javascript
// Response (200 OK)
{
    "success": true,
    "count": 2,
    "calls": [
        {
            "callId": "WLCM-123",
            "channel": "PJSIP/1001-00000001",
            "state": "6",
            "startTime": "2025-10-25T10:30:00Z",
            "direction": "outbound"
        }
    ]
}
```

**GET /api/telephony/calls/history?limit=50&offset=0**

Obtiene historial de llamadas del agente actual.

```javascript
// Response (200 OK)
{
    "success": true,
    "count": 150,
    "calls": [
        {
            "id": 456,
            "callId": "WLCM-123",
            "direction": "outbound",
            "callerNumber": "1001",
            "calleeNumber": "+1234567890",
            "startTime": "2025-10-25T10:30:00Z",
            "endTime": "2025-10-25T10:35:30Z",
            "duration": 330,
            "billsec": 320,
            "disposition": "ANSWERED",
            "campaign": { "id": 1, "nombre": "Sales Q4" },
            "lead": { "id": 123, "nombre": "John Doe" }
        }
    ]
}
```

**GET /api/telephony/calls/stats?startDate=2025-10-01&endDate=2025-10-31**

Obtiene estadísticas de llamadas del agente.

```javascript
// Response (200 OK)
{
    "success": true,
    "stats": {
        "totalCalls": 150,
        "answered": 120,
        "noAnswer": 20,
        "busy": 5,
        "failed": 3,
        "cancelled": 2,
        "totalDuration": 18000,
        "totalBillsec": 15000,
        "avgDuration": 120,
        "avgBillsec": 125,
        "answerRate": "80.00"
    }
}
```

#### 5.1.3 Gestión SIP

**GET /api/telephony/sip/status**

Obtiene estado del SIP peer del agente actual.

```javascript
// Response (200 OK)
{
    "success": true,
    "sipPeer": {
        "username": "johndoe",
        "extension": "1001",
        "status": "active",
        "registered": true,
        "lastRegisteredAt": "2025-10-25T10:00:00Z",
        "userAgent": "SIP.js/0.21.0",
        "ipAddress": "192.168.1.10"
    }
}
```

**GET /api/telephony/sip/credentials**

Obtiene credenciales SIP para configurar softphone WebRTC.

```javascript
// Response (200 OK)
{
    "success": true,
    "credentials": {
        "sipServer": "pbx.welcomedly.com",
        "sipPort": "8089",
        "username": "johndoe",
        "password": "auto_generated_password",
        "extension": "1001",
        "displayName": "John Doe"
    }
}
```

**POST /api/telephony/sip/create** (Solo Admin)

Crea un SIP peer para un usuario.

```javascript
// Request
POST /api/telephony/sip/create
Content-Type: application/json

{
    "userId": 5,
    "primerNombre": "John",
    "primerApellido": "Doe"
}

// Response (200 OK)
{
    "success": true,
    "message": "SIP peer created successfully",
    "sipPeer": {
        "sipUsername": "johndoe",
        "extension": "1001",
        "status": "active"
    }
}
```

#### 5.1.4 Gestión de Troncales

**GET /api/telephony/trunks** (Solo Admin)

Lista todas las troncales configuradas.

```javascript
// Response (200 OK)
{
    "success": true,
    "count": 3,
    "trunks": [
        {
            "id": 1,
            "name": "Twilio Main",
            "provider": "twilio",
            "status": "active",
            "registered": true,
            "maxChannels": 20,
            "priority": 1,
            "totalCalls": 1500,
            "successfulCalls": 1400,
            "failedCalls": 100
        }
    ]
}
```

#### 5.1.5 Estado del Servicio

**GET /api/telephony/status**

Obtiene estado del servicio de telefonía.

```javascript
// Response (200 OK)
{
    "success": true,
    "status": {
        "connected": true,
        "activeCalls": 5,
        "callsInProgress": 3
    }
}
```

---

## 6. Flujos de Trabajo

### 6.1 Flujo: Realizar Llamada Saliente

```
┌──────────┐     ┌────────────┐     ┌──────────────┐     ┌──────────┐
│  Agent   │     │ Welcomedly │     │  Telephony   │     │ Asterisk │
│ Browser  │     │  Backend   │     │   Service    │     │   PBX    │
└────┬─────┘     └─────┬──────┘     └──────┬───────┘     └────┬─────┘
     │                  │                    │                   │
     │ 1. Click "Call"  │                    │                   │
     │─────────────────>│                    │                   │
     │                  │                    │                   │
     │            2. POST /api/telephony/    │                   │
     │                  │   call/originate   │                   │
     │                  │───────────────────>│                   │
     │                  │                    │ 3. Get best trunk │
     │                  │                    │<─────────────────>│
     │                  │                    │ (DB query)        │
     │                  │                    │                   │
     │                  │                    │ 4. AMI Originate  │
     │                  │                    │──────────────────>│
     │                  │                    │                   │
     │                  │                    │   5. Call created │
     │                  │                    │<──────────────────│
     │                  │  6. Response       │                   │
     │                  │<───────────────────│                   │
     │  7. Success msg  │                    │                   │
     │<─────────────────│                    │                   │
     │                  │                    │                   │
     │                  │   8. AMI Event:    │   9. Ringing     │
     │                  │      newchannel    │<─────────────────│
     │                  │<───────────────────│                   │
     │                  │                    │                   │
     │                  │   10. AMI Event:   │   11. Answer     │
     │                  │       dial         │<─────────────────│
     │                  │<───────────────────│                   │
     │                  │                    │                   │
     │                  │   12. AMI Event:   │   13. Connected  │
     │                  │       bridge       │<─────────────────│
     │                  │<───────────────────│                   │
     │  14. Update UI   │                    │                   │
     │<─────────────────│                    │                   │
     │   "In call..."   │                    │                   │
     │                  │                    │                   │
     │  15. Hangup      │                    │                   │
     │─────────────────>│  16. POST hangup   │                   │
     │                  │───────────────────>│  17. AMI Hangup  │
     │                  │                    │──────────────────>│
     │                  │                    │                   │
     │                  │   18. AMI Event:   │   19. Hung up    │
     │                  │       hangup       │<─────────────────│
     │                  │<───────────────────│                   │
     │                  │                    │ 20. Save CDR to DB│
     │                  │                    │───────────────────│
     │                  │                    │ 21. Update trunk  │
     │                  │                    │    statistics     │
     │  22. Call ended  │                    │                   │
     │<─────────────────│                    │                   │
```

### 6.2 Flujo: Failover de Troncal

```
Agent Clicks "Call"
    │
    ▼
Get best available trunk (priority order)
    │
    ├──> Try Trunk 1 (Priority 1)
    │    │
    │    ├──> Check capacity: 18/20 channels ✓
    │    ├──> Check registered: true ✓
    │    └──> Select Trunk 1
    │
    └──> (If Trunk 1 at capacity or failed)
         │
         ├──> Try Trunk 2 (Priority 2)
         │    │
         │    ├──> Check capacity: 5/10 channels ✓
         │    ├──> Check registered: false ✗
         │    └──> Skip to next
         │
         └──> Try Trunk 3 (Priority 3)
              │
              ├──> Check capacity: 3/10 channels ✓
              ├──> Check registered: true ✓
              └──> Select Trunk 3
```

---

## 7. Configuración

### 7.1 Variables de Entorno

Agregar a `.env`:

```env
# ==========================================
# Asterisk AMI Configuration
# ==========================================
ASTERISK_HOST=localhost
ASTERISK_PORT=5038
ASTERISK_USER=admin
ASTERISK_PASSWORD=secret

# ==========================================
# Asterisk WebRTC WebSocket (para softphone)
# ==========================================
ASTERISK_WSS_HOST=pbx.welcomedly.com
ASTERISK_WSS_PORT=8089

# ==========================================
# Database (si no está ya configurado)
# ==========================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=miappdb
DB_USER=postgres
DB_PASSWORD=your_password
```

### 7.2 Configuración de Asterisk

#### 7.2.1 Archivo `/etc/asterisk/manager.conf`

```ini
[general]
enabled = yes
port = 5038
bindaddr = 0.0.0.0

[welcomedly]
secret = secret
deny = 0.0.0.0/0.0.0.0
permit = 127.0.0.1/255.255.255.255
permit = YOUR_APP_SERVER_IP/255.255.255.255
read = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan
write = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan
```

#### 7.2.2 Archivo `/etc/asterisk/pjsip.conf`

```ini
[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089
external_media_address=YOUR_PUBLIC_IP
external_signaling_address=YOUR_PUBLIC_IP

[twilio-trunk]
type=registration
outbound_auth=twilio-auth
server_uri=sip:sip.twilio.com
client_uri=sip:YOUR_ACCOUNT_SID@sip.twilio.com
retry_interval=60

[twilio-auth]
type=auth
auth_type=userpass
username=YOUR_ACCOUNT_SID
password=YOUR_AUTH_TOKEN

[twilio-endpoint]
type=endpoint
context=welcomedly-inbound
disallow=all
allow=ulaw,alaw
outbound_auth=twilio-auth
aors=twilio-aor

[twilio-aor]
type=aor
contact=sip:sip.twilio.com

[agent-template](!)
type=endpoint
context=welcomedly-agents
disallow=all
allow=ulaw,alaw,opus
webrtc=yes
dtls_auto_generate_cert=yes
media_encryption=dtls
```

#### 7.2.3 Archivo `/etc/asterisk/extensions.conf`

```ini
[welcomedly-outbound]
exten => _X.,1,NoOp(Outbound call to ${EXTEN} via trunk ${TRUNK_ID})
 same => n,Set(TRUNK=${DB(trunk/${TRUNK_ID}/name)})
 same => n,Dial(PJSIP/${EXTEN}@twilio-endpoint,30)
 same => n,Hangup()

[welcomedly-inbound]
exten => _X.,1,NoOp(Inbound call from ${CALLERID(num)})
 same => n,Queue(welcome-queue,t,,,300)
 same => n,Hangup()
```

### 7.3 Migraciones de Base de Datos

Ejecutar migraciones:

```bash
# Crear tablas de telefonía
node src/database/migrations/run_js_migration.js 20251025_create_telephony_tables.js

# Crear tabla de troncales y actualizar calls
node src/database/migrations/run_js_migration.js 20251025_create_trunks_table.js
```

### 7.4 Inicialización del Servicio

En `src/index.js`, agregar después de configurar Express:

```javascript
import telephonyService from './services/telephonyService.js';

// ... configuración de Express ...

// Inicializar servicio de telefonía
try {
    await telephonyService.initialize();
    console.log('✅ Telephony service initialized');
} catch (error) {
    console.error('❌ Failed to initialize telephony service:', error);
    // No detener el servidor, continuar sin telefonía
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n📴 Shutting down gracefully...');
    await telephonyService.shutdown();
    process.exit(0);
});
```

---

## 8. Testing

### 8.1 Tests Implementados

Archivo: `tests/telephony.test.js`

**Cobertura:**
- ✅ Trunk Model (7 tests)
- ✅ SipPeer Model (4 tests)
- ✅ Call Model (5 tests)
- ✅ Integration Tests (2 tests)

**Total:** 18 tests

### 8.2 Ejecutar Tests

```bash
# Todos los tests de telefonía
npm test -- tests/telephony.test.js

# Tests específicos
npm test -- tests/telephony.test.js -t "Trunk Model"
```

### 8.3 Test Manual con curl

**Originar llamada:**
```bash
curl -X POST http://localhost:3000/api/telephony/call/originate \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d '{
    "agentExtension": "1001",
    "customerPhone": "+1234567890",
    "campaignId": 1,
    "leadId": 123
  }'
```

**Obtener estado:**
```bash
curl http://localhost:3000/api/telephony/status \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

---

## 9. Deployment

### 9.1 Checklist de Deployment

**Infraestructura:**
- [ ] Servidor Asterisk 20+ instalado y configurado
- [ ] FreePBX 17 (opcional)
- [ ] Coturn para STUN/TURN
- [ ] PostgreSQL 14+ con extensiones activadas
- [ ] Node.js 18+ LTS

**Configuración:**
- [ ] Variables de entorno configuradas
- [ ] Asterisk AMI habilitado y accesible
- [ ] WebSocket WSS configurado con certificado SSL
- [ ] Firewall: Puertos 5038 (AMI), 8089 (WSS), 5060 (SIP) abiertos
- [ ] DNS configurado para dominio PBX

**Base de Datos:**
- [ ] Migraciones ejecutadas
- [ ] Al menos una troncal SIP configurada
- [ ] SIP peers creados para agentes

**Monitoreo:**
- [ ] Logs de Asterisk configurados
- [ ] Logs de aplicación configurados
- [ ] Alertas para fallos de troncal
- [ ] Dashboard de llamadas activas

### 9.2 Arquitectura de Producción

```
Internet
   │
   ├──> Load Balancer (HTTPS)
   │       │
   │       ├──> Node.js App 1
   │       ├──> Node.js App 2
   │       └──> Node.js App 3
   │
   ├──> Asterisk Cluster
   │       │
   │       ├──> Asterisk Master (AMI)
   │       └──> Asterisk Slave (Failover)
   │
   └──> Database Cluster
           │
           ├──> PostgreSQL Primary
           └──> PostgreSQL Replica (Read)
```

---

## 10. Roadmap

### Sprint 3.1.4 - Softphone WebRTC (Pendiente)

**Tareas:**
- [ ] Instalar y configurar SIP.js
- [ ] Crear componente Softphone React/Vue
- [ ] Implementar controles de llamada (dial, answer, hangup, mute, hold)
- [ ] Integrar con Agent Workstation
- [ ] Visualización de estado en tiempo real
- [ ] Manejo de audio (ring tones, busy tones)

**Prioridad:** Alta
**Estimación:** 2-3 semanas

### Sprint 3.1.5 - Integración con Estados de Agente (Pendiente)

**Tareas:**
- [ ] Cambio automático de estado al recibir llamada
- [ ] Transiciones: available → in_call → after_call_work
- [ ] Sincronización bidireccional Asterisk ↔ Welcomedly
- [ ] Dashboard de estados en tiempo real
- [ ] Notificaciones de llamadas entrantes

**Prioridad:** Media
**Estimación:** 1-2 semanas

### Futuras Mejoras

**Fase 2:**
- WebSocket en tiempo real para eventos de llamada (Socket.io)
- Grabación automática de llamadas
- Transcripción de llamadas con IA
- IVR (Interactive Voice Response)
- Call queuing inteligente

**Fase 3:**
- Predictive dialer
- Call blending (inbound + outbound)
- Análisis de sentimiento en vivo
- Quality Management & Scoring
- Wallboard para supervisores

---

## Anexos

### A. Estructura de Archivos

```
src/
├── models/
│   ├── Call.js                 # Modelo de llamadas (CDR)
│   ├── SipPeer.js              # Modelo de cuentas SIP
│   ├── Trunk.js                # Modelo de troncales
│   └── index.js                # Registro de modelos
├── services/
│   └── telephonyService.js     # Servicio de telefonía (AMI)
├── controllers/
│   └── telephonyController.js  # Controlador API REST
├── routes/
│   ├── telephonyRoutes.js      # Rutas de telefonía
│   └── index.js                # Registro de rutas
├── database/
│   └── migrations/
│       ├── 20251025_create_telephony_tables.js
│       └── 20251025_create_trunks_table.js
└── index.js                    # Punto de entrada

tests/
└── telephony.test.js           # Tests del sistema

docs/
├── ASTERISK_WEBRTC_ARCHITECTURE.md
├── TRUNK_MANAGEMENT_GUIDE.md
└── TELEPHONY_SYSTEM_DOCUMENTATION.md (este archivo)
```

### B. Glosario

- **AMI**: Asterisk Manager Interface - Interfaz de gestión de Asterisk
- **ARI**: Asterisk REST Interface - API REST de Asterisk
- **CDR**: Call Detail Record - Registro detallado de llamada
- **PJSIP**: Modern SIP stack for Asterisk
- **SIP**: Session Initiation Protocol - Protocolo de telefonía VoIP
- **Trunk**: Troncal SIP para conectar PBX con proveedores
- **WebRTC**: Web Real-Time Communication - Estándar para llamadas en navegador
- **WSS**: WebSocket Secure - WebSocket sobre TLS/SSL

### C. Referencias

- [Asterisk Documentation](https://wiki.asterisk.org/)
- [PJSIP Configuration](https://wiki.asterisk.org/wiki/display/AST/Configuring+res_pjsip)
- [Twilio SIP Trunking](https://www.twilio.com/docs/sip-trunking)
- [SIP.js Documentation](https://sipjs.com/)
- [WebRTC for Asterisk](https://wiki.asterisk.org/wiki/display/AST/WebRTC)

---

**Documento generado:** Sprint 3.1.3
**Última actualización:** Octubre 2025
**Versión:** 1.0.0
**Estado:** Completo (Backend), Pendiente (Frontend)
