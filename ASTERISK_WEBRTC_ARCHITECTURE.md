# Arquitectura de Integración Asterisk/FreePBX + WebRTC - Sprint 3.1

## Resumen Ejecutivo

Esta documentación describe la arquitectura para integrar telefonía real en Welcomedly usando **Asterisk/FreePBX** con **WebRTC** (SIP.js), proporcionando capacidades de call center profesional sin costos recurrentes de servicios como Twilio.

---

## 1. Stack Tecnológico

### Backend (PBX)
- **Asterisk 20+** - Motor de PBX open source
- **FreePBX 17** - Panel de administración web (opcional pero recomendado)
- **Chan_PJSIP** - Stack SIP moderno para Asterisk
- **WebRTC** - Protocolo para llamadas en el navegador
- **STUN/TURN Server** - Coturn para NAT traversal

### Frontend (Agent Workstation)
- **SIP.js 0.21+** - Librería JavaScript para WebRTC/SIP
- **WebRTC APIs** - getUserMedia, RTCPeerConnection
- **Modern Layout** - Ya implementado en Sprint 3.0

### Integración
- **Asterisk Manager Interface (AMI)** - Control y eventos en tiempo real
- **Asterisk REST Interface (ARI)** - API REST para aplicaciones
- **Node.js AMI Client** - `asterisk-manager` npm package
- **PostgreSQL** - Almacenar CDRs (Call Detail Records)

---

## 2. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    WELCOMEDLY PLATFORM                       │
│                                                               │
│  ┌────────────────┐         ┌────────────────┐              │
│  │  Agent Browser │◄────────┤  Agent Browser │              │
│  │   (WebRTC)     │  SIP.js │   (WebRTC)     │              │
│  └───────┬────────┘         └────────┬───────┘              │
│          │                            │                       │
│          │ WSS (Secure WebSocket)     │                       │
│          │                            │                       │
│  ┌───────▼────────────────────────────▼───────┐              │
│  │         Node.js Express Server             │              │
│  │  ┌──────────────────────────────────────┐  │              │
│  │  │   WebSocket Proxy (ws → wss)         │  │              │
│  │  └──────────────────────────────────────┘  │              │
│  │  ┌──────────────────────────────────────┐  │              │
│  │  │   AMI Client (Event Listener)        │  │              │
│  │  └──────────────────────────────────────┘  │              │
│  │  ┌──────────────────────────────────────┐  │              │
│  │  │   Telephony Service (Call Logic)     │  │              │
│  │  └──────────────────────────────────────┘  │              │
│  └────────────┬───────────────────────────────┘              │
│               │                                               │
└───────────────┼───────────────────────────────────────────────┘
                │
                │ AMI/ARI (Port 5038/8088)
                │
        ┌───────▼───────────────────────────┐
        │   ASTERISK PBX SERVER             │
        │                                    │
        │  ┌──────────────────────────────┐ │
        │  │  Chan_PJSIP (WebRTC)         │ │
        │  │  - WSS Transport (Port 8089) │ │
        │  │  - SIP Peers (Agents)        │ │
        │  └──────────────────────────────┘ │
        │  ┌──────────────────────────────┐ │
        │  │  Dialplan (Extensions)       │ │
        │  │  - Inbound Routing           │ │
        │  │  - Outbound Routing          │ │
        │  │  - Queue Management          │ │
        │  └──────────────────────────────┘ │
        │  ┌──────────────────────────────┐ │
        │  │  Call Recording              │ │
        │  │  - MixMonitor                │ │
        │  │  - Store to /var/spool       │ │
        │  └──────────────────────────────┘ │
        │  ┌──────────────────────────────┐ │
        │  │  Queues                      │ │
        │  │  - Campaign Queues           │ │
        │  │  - Agent Assignment          │ │
        │  └──────────────────────────────┘ │
        └────────────────────────────────────┘
                │
                │ SIP Trunk (PSTN)
                │
        ┌───────▼───────────────────────────┐
        │   SIP Provider (Optional)         │
        │   - Twilio SIP                    │
        │   - Vonage                        │
        │   - Local PSTN Gateway            │
        └───────────────────────────────────┘
```

---

## 3. Flujo de Llamada

### 3.1 Llamada Entrante (Inbound)

```
1. Cliente llama → PSTN/SIP Trunk
                    ↓
2. Asterisk recibe llamada
                    ↓
3. Dialplan route → Queue (por campaña)
                    ↓
4. AMI Event: QueueMemberRinging
                    ↓
5. Node.js detecta evento
                    ↓
6. WebSocket → Notifica agente disponible
                    ↓
7. Agente acepta llamada en UI
                    ↓
8. SIP.js establece conexión WebRTC
                    ↓
9. Asterisk conecta agente con cliente
                    ↓
10. Estado del agente: "available" → "in_call"
                    ↓
11. Inicio de grabación automática
                    ↓
12. Agente maneja llamada (formulario, CRM)
                    ↓
13. Cliente/Agente cuelga
                    ↓
14. Estado del agente: "in_call" → "after_call_work"
                    ↓
15. Formulario de disposición se muestra
                    ↓
16. Agente completa disposición
                    ↓
17. CDR se guarda en PostgreSQL
                    ↓
18. Estado del agente: "after_call_work" → "available"
```

### 3.2 Llamada Saliente (Outbound)

```
1. Agente hace clic en "Llamar" (lead)
                    ↓
2. Frontend envía request a Node.js
                    ↓
3. Node.js → AMI Originate Command
                    ↓
4. Asterisk marca número externo
                    ↓
5. Mientras tanto, conecta agente primero
                    ↓
6. SIP.js/WebRTC establece canal con agente
                    ↓
7. Agente escucha ringback tone
                    ↓
8. Cliente contesta
                    ↓
9. Asterisk bridge ambos canales
                    ↓
10. Estado: "available" → "in_call"
                    ↓
11. [Continúa igual que inbound desde paso 11]
```

---

## 4. Componentes a Implementar

### 4.1 Modelo de Base de Datos

**Tabla: `calls` (CDR - Call Detail Records)**
```sql
CREATE TABLE calls (
    id SERIAL PRIMARY KEY,
    call_id VARCHAR(255) UNIQUE NOT NULL,           -- Asterisk UniqueID
    agent_id INTEGER REFERENCES usuarios(id),
    campaign_id INTEGER REFERENCES campanas(id),
    lead_id INTEGER REFERENCES base_campanas(id),
    direction VARCHAR(10) NOT NULL,                 -- 'inbound' | 'outbound'
    caller_number VARCHAR(50),
    callee_number VARCHAR(50),
    start_time TIMESTAMPTZ NOT NULL,
    answer_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    duration INTEGER,                               -- Total duration (seconds)
    billsec INTEGER,                                -- Billable seconds (after answer)
    disposition VARCHAR(20),                        -- 'ANSWERED', 'NO ANSWER', 'BUSY', 'FAILED'
    recording_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_calls_agent ON calls(agent_id);
CREATE INDEX idx_calls_campaign ON calls(campaign_id);
CREATE INDEX idx_calls_start_time ON calls(start_time);
```

**Tabla: `sip_peers` (Agentes registrados)**
```sql
CREATE TABLE sip_peers (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES usuarios(id) UNIQUE,
    sip_username VARCHAR(50) UNIQUE NOT NULL,
    sip_password VARCHAR(100) NOT NULL,
    sip_server VARCHAR(255) NOT NULL,
    websocket_url VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'offline',           -- 'online', 'offline', 'registered'
    last_registered TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Servicio de Telefonía (Backend)

**`src/services/telephonyService.js`**
```javascript
import AsteriskManager from 'asterisk-manager';
import db from '../models/index.js';
import logger from '../utils/logger.js';

class TelephonyService {
    constructor() {
        this.ami = new AsteriskManager(
            process.env.ASTERISK_PORT || 5038,
            process.env.ASTERISK_HOST || 'localhost',
            process.env.ASTERISK_USER || 'admin',
            process.env.ASTERISK_PASSWORD || 'secret',
            true // Keep alive
        );

        this.setupEventListeners();
    }

    /**
     * Setup AMI Event Listeners
     */
    setupEventListeners() {
        // Connection events
        this.ami.on('connect', () => {
            logger.info('Connected to Asterisk AMI');
        });

        this.ami.on('error', (error) => {
            logger.error('AMI Error:', error);
        });

        // Call events
        this.ami.on('managerevent', (event) => {
            this.handleAsteriskEvent(event);
        });
    }

    /**
     * Handle Asterisk Events
     */
    async handleAsteriskEvent(event) {
        switch(event.event) {
            case 'Newchannel':
                await this.handleNewChannel(event);
                break;
            case 'Hangup':
                await this.handleHangup(event);
                break;
            case 'QueueMemberRinging':
                await this.handleQueueRinging(event);
                break;
            // ... more events
        }
    }

    /**
     * Originate outbound call
     */
    async originateCall(agentSipUri, customerPhone, campaignId, leadId) {
        return new Promise((resolve, reject) => {
            this.ami.action({
                'action': 'originate',
                'channel': `PJSIP/${agentSipUri}`,
                'exten': customerPhone,
                'context': 'welcomedly-outbound',
                'priority': 1,
                'callerid': `Agent <${agentSipUri}>`,
                'timeout': 30000,
                'async': true,
                'variable': {
                    'CAMPAIGN_ID': campaignId,
                    'LEAD_ID': leadId
                }
            }, (err, res) => {
                if (err) reject(err);
                else resolve(res);
            });
        });
    }

    /**
     * Get call status
     */
    async getCallStatus(callId) {
        // Query Asterisk for channel status
        return new Promise((resolve, reject) => {
            this.ami.action({
                'action': 'Status',
                'channel': callId
            }, (err, res) => {
                if (err) reject(err);
                else resolve(res);
            });
        });
    }

    /**
     * Hangup call
     */
    async hangupCall(callId) {
        return new Promise((resolve, reject) => {
            this.ami.action({
                'action': 'Hangup',
                'channel': callId
            }, (err, res) => {
                if (err) reject(err);
                else resolve(res);
            });
        });
    }
}

export default new TelephonyService();
```

### 4.3 Frontend - Softphone Component

**`src/public/js/softphone.js`** (usando SIP.js)
```javascript
import { Web } from 'sip.js';

class Softphone {
    constructor(config) {
        this.config = config;
        this.session = null;
        this.userAgent = null;
    }

    /**
     * Initialize SIP User Agent
     */
    async init() {
        const server = `wss://${this.config.sipServer}:8089/ws`;

        this.userAgent = new Web.SimpleUser(server, {
            aor: `sip:${this.config.username}@${this.config.domain}`,
            media: {
                remote: {
                    audio: document.getElementById('remoteAudio')
                }
            },
            userAgentOptions: {
                authorizationUsername: this.config.username,
                authorizationPassword: this.config.password,
                displayName: this.config.displayName
            }
        });

        // Event listeners
        this.userAgent.delegate = {
            onCallReceived: () => this.handleIncomingCall(),
            onCallAnswered: () => this.handleCallAnswered(),
            onCallHangup: () => this.handleCallHangup()
        };

        await this.userAgent.connect();
        await this.userAgent.register();
    }

    /**
     * Make outbound call
     */
    async call(phoneNumber) {
        const target = `sip:${phoneNumber}@${this.config.domain}`;
        this.session = await this.userAgent.call(target);
    }

    /**
     * Answer incoming call
     */
    async answer() {
        if (this.session) {
            await this.session.accept();
        }
    }

    /**
     * Hangup call
     */
    async hangup() {
        if (this.session) {
            await this.session.bye();
        }
    }

    /**
     * Handle incoming call
     */
    handleIncomingCall() {
        // Show incoming call UI
        // Emit WebSocket event to update agent status
    }

    /**
     * Handle call answered
     */
    handleCallAnswered() {
        // Update UI to "in call" state
        // Emit WebSocket event
    }

    /**
     * Handle call hangup
     */
    handleCallHangup() {
        // Show disposition form
        // Update agent status to "after_call_work"
    }
}

export default Softphone;
```

---

## 5. Configuración de Asterisk

### 5.1 pjsip.conf - WebRTC Transport

```ini
[transport-wss]
type=transport
protocol=wss
bind=0.0.0.0:8089
external_media_address=YOUR_PUBLIC_IP
external_signaling_address=YOUR_PUBLIC_IP

[webrtc_client]
type=aor
max_contacts=1

[webrtc_client]
type=auth
auth_type=userpass

[webrtc_client]
type=endpoint
aors=webrtc_client
auth=webrtc_client
dtls_auto_generate_cert=yes
webrtc=yes
context=welcomedly-inbound
disallow=all
allow=opus,ulaw
```

### 5.2 extensions.conf - Dialplan

```ini
[welcomedly-inbound]
; Incoming calls go to queue
exten => _X.,1,NoOp(Incoming call from ${CALLERID(num)})
 same => n,Set(CAMPAIGN_ID=${ARG1})
 same => n,Queue(campaign_${CAMPAIGN_ID},t,,,300)
 same => n,Hangup()

[welcomedly-outbound]
; Outbound calls
exten => _X.,1,NoOp(Outbound call to ${EXTEN})
 same => n,MixMonitor(/var/spool/asterisk/monitor/${UNIQUEID}.wav)
 same => n,Dial(PJSIP/${EXTEN}@trunk,60,g)
 same => n,Hangup()
```

### 5.3 queues.conf - Campaign Queues

```ini
[general]
persistentmembers = yes
autofill = yes
monitor-type = MixMonitor

[campaign_1]
strategy = rrmemory
timeout = 30
retry = 5
maxlen = 100
announce-frequency = 90
```

---

## 6. Instalación y Configuración

### 6.1 Instalar Asterisk en Ubuntu

```bash
# Install dependencies
sudo apt update
sudo apt install -y build-essential wget libssl-dev libncurses5-dev \
    libnewt-dev libxml2-dev linux-headers-$(uname -r) libsqlite3-dev \
    uuid-dev libjansson-dev

# Download Asterisk
cd /usr/src
sudo wget http://downloads.asterisk.org/pub/telephony/asterisk/asterisk-20-current.tar.gz
sudo tar xvf asterisk-20-current.tar.gz
cd asterisk-20*/

# Configure
sudo ./configure --with-pjproject-bundled --with-jansson-bundled

# Install
sudo make menuselect  # Select modules (especially chan_pjsip, res_pjsip_*)
sudo make
sudo make install
sudo make samples
sudo make config

# Create asterisk user
sudo useradd -r -d /var/lib/asterisk -s /bin/bash asterisk
sudo chown -R asterisk:asterisk /etc/asterisk /var/lib/asterisk /var/spool/asterisk /var/log/asterisk

# Start Asterisk
sudo systemctl start asterisk
sudo systemctl enable asterisk
```

### 6.2 Configurar Coturn (STUN/TURN)

```bash
# Install
sudo apt install coturn

# Configure /etc/turnserver.conf
listening-port=3478
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=YOUR_SECRET_KEY
realm=welcomedly.com
total-quota=100
stale-nonce=600
cert=/etc/letsencrypt/live/turn.welcomedly.com/cert.pem
pkey=/etc/letsencrypt/live/turn.welcomedly.com/privkey.pem

# Start
sudo systemctl start coturn
sudo systemctl enable coturn
```

---

## 7. Variables de Entorno

Agregar al `.env`:

```bash
# Asterisk Configuration
ASTERISK_HOST=localhost
ASTERISK_PORT=5038
ASTERISK_USER=admin
ASTERISK_PASSWORD=your_ami_password
ASTERISK_SIP_DOMAIN=sip.welcomedly.com
ASTERISK_WSS_URL=wss://sip.welcomedly.com:8089/ws

# TURN/STUN Configuration
TURN_SERVER=turn.welcomedly.com
TURN_USERNAME=user
TURN_PASSWORD=password
STUN_SERVER=stun.l.google.com:19302
```

---

## 8. Próximos Pasos

1. ✅ Documentar arquitectura (este documento)
2. ⏳ Crear modelos de base de datos (Call, SipPeer)
3. ⏳ Implementar TelephonyService con AMI
4. ⏳ Crear componente Softphone (SIP.js)
5. ⏳ Integrar con Agent Workstation
6. ⏳ Implementar eventos de cambio de estado
7. ⏳ Agregar grabación de llamadas
8. ⏳ Dashboard de supervisor en tiempo real

---

## 9. Recursos Adicionales

- [Asterisk WebRTC Guide](https://wiki.asterisk.org/wiki/display/AST/WebRTC)
- [SIP.js Documentation](https://sipjs.com/guides/)
- [FreePBX Installation Guide](https://wiki.freepbx.org/display/FOP/Installing+FreePBX+17+on+Debian+11)
- [Coturn Configuration](https://github.com/coturn/coturn/wiki/turnserver)
