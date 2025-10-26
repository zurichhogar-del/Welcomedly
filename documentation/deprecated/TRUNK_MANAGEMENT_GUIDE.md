# Guía de Gestión de Troncales SIP - Welcomedly

## Resumen

Esta guía explica el sistema de gestión de troncales (trunks) SIP implementado en Welcomedly para gestionar las salidas de llamadas a través de múltiples proveedores de telefonía.

---

## ¿Qué es una Troncal SIP?

Una **troncal SIP** (SIP Trunk) es una conexión virtual entre tu PBX (Asterisk) y un proveedor de servicios de telefonía (ITSP - Internet Telephony Service Provider) que permite realizar y recibir llamadas telefónicas a través de Internet.

### Proveedores Soportados

El sistema soporta los siguientes tipos de proveedores:

1. **Twilio** - Proveedor cloud popular con cobertura global
2. **Vonage** - Proveedor empresarial con buenas tarifas
3. **Bandwidth** - Proveedor mayorista de voz
4. **Custom** - Cualquier proveedor SIP personalizado

---

## Modelo de Datos

### Tabla: `trunks`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | INTEGER | ID único de la troncal |
| `name` | VARCHAR(100) | Nombre amigable (ej: "Twilio Principal") |
| `description` | TEXT | Descripción y notas |
| `provider` | ENUM | Tipo de proveedor (twilio, vonage, bandwidth, custom) |
| `trunk_type` | ENUM | Tecnología Asterisk (sip, iax2, pjsip) |
| `host` | VARCHAR(255) | Hostname del servidor SIP (ej: sip.twilio.com) |
| `port` | INTEGER | Puerto SIP (default: 5060) |
| `username` | VARCHAR(100) | Usuario de autenticación SIP |
| `password` | VARCHAR(255) | Contraseña (encriptada) |
| `from_user` | VARCHAR(100) | SIP From User (Caller ID) |
| `from_domain` | VARCHAR(255) | SIP From Domain |
| `max_channels` | INTEGER | Máximo de llamadas concurrentes |
| `priority` | INTEGER | Prioridad para enrutamiento (1=más alta, 100=más baja) |
| `status` | ENUM | Estado operacional (active, inactive, maintenance, error) |
| `registered` | BOOLEAN | Estado de registro actual con el proveedor |
| `last_registered_at` | TIMESTAMP | Última vez que se registró exitosamente |
| `last_error_at` | TIMESTAMP | Última vez que ocurrió un error |
| `last_error_message` | TEXT | Mensaje del último error |
| `total_calls` | INTEGER | Total de llamadas enrutadas |
| `successful_calls` | INTEGER | Llamadas exitosas |
| `failed_calls` | INTEGER | Llamadas fallidas |
| `advanced_settings` | JSONB | Configuraciones avanzadas (codecs, DTMF, NAT, etc.) |

### Tabla: `campaign_trunks`

Relación many-to-many entre campañas y troncales:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `campana_id` | INTEGER | ID de la campaña |
| `trunk_id` | INTEGER | ID de la troncal |
| `priority` | INTEGER | Prioridad de la troncal para esta campaña específica |

### Actualización a Tabla: `calls`

Se agregó el campo:
- `trunk_id` (INTEGER): ID de la troncal SIP utilizada para la llamada saliente

---

## Funcionalidades del Modelo Trunk

### Métodos de Instancia

```javascript
// Actualizar estado de registro
await trunk.updateRegistration(true);

// Registrar error
await trunk.recordError('Connection timeout');

// Registrar llamada
await trunk.recordCall(true); // success=true

// Activar/desactivar
await trunk.activate();
await trunk.deactivate();
await trunk.setMaintenance();
```

### Métodos Estáticos

```javascript
// Obtener troncales disponibles (ordenadas por prioridad)
const trunks = await Trunk.getAvailable();

// Obtener la mejor troncal disponible (con capacidad libre)
const bestTrunk = await Trunk.getBestAvailable();

// Buscar por nombre
const trunk = await Trunk.findByName('Twilio Main');

// Obtener estadísticas globales
const stats = await Trunk.getStats();
// Retorna: { total, active, registered, error, inactive, totalCalls, successfulCalls, successRate }
```

### Campos Virtuales

```javascript
trunk.isAvailable      // true si status=active && registered=true
trunk.successRate      // Porcentaje de llamadas exitosas
trunk.failureRate      // Porcentaje de llamadas fallidas
```

---

## Lógica de Enrutamiento de Llamadas

### 1. Selección de Troncal por Prioridad

Cuando se realiza una llamada saliente, el sistema:

1. Consulta las troncales disponibles (`status='active'` y `registered=true`)
2. Las ordena por campo `priority` (1 = más alta prioridad)
3. Para cada troncal en orden:
   - Verifica cuántas llamadas activas tiene actualmente
   - Si tiene capacidad disponible (`currentCalls < maxChannels`), la selecciona
   - Si no, pasa a la siguiente troncal
4. Si ninguna troncal tiene capacidad, la llamada falla

```javascript
const trunk = await Trunk.getBestAvailable();
if (!trunk) {
    throw new Error('No hay troncales disponibles');
}
```

### 2. Selección por Campaña

Las campañas pueden tener troncales asignadas con prioridades específicas:

```javascript
// En la tabla campaign_trunks
// Campaña 1 puede tener:
// - trunk_id=1, priority=1  (Twilio - principal)
// - trunk_id=2, priority=2  (Vonage - backup)

// El sistema intentará primero con Twilio, y si falla, con Vonage
```

### 3. Registro de Llamada con Troncal

```javascript
// Al crear un registro de llamada saliente
const call = await Call.create({
    callId: asteriskUniqueId,
    agentId: agent.id,
    campaignId: campaign.id,
    leadId: lead.id,
    trunkId: trunk.id,  // ← Registro de qué troncal se usó
    direction: 'outbound',
    callerNumber: agentExtension,
    calleeNumber: customerPhone,
    startTime: new Date()
});

// Registrar estadística en la troncal
await trunk.recordCall(callSuccessful);
```

---

## Configuración de Proveedores

### Ejemplo: Twilio

```javascript
const twilioTrunk = await Trunk.create({
    name: 'Twilio Principal',
    description: 'Troncal principal para llamadas salientes',
    provider: 'twilio',
    trunkType: 'pjsip',
    host: 'sip.twilio.com',
    port: 5060,
    username: 'TU_ACCOUNT_SID',
    password: 'TU_AUTH_TOKEN',
    fromUser: '+1234567890',  // Tu número Twilio
    fromDomain: 'sip.twilio.com',
    maxChannels: 20,
    priority: 1,  // Máxima prioridad
    status: 'active'
});
```

### Ejemplo: Vonage (Nexmo)

```javascript
const vonageTrunk = await Trunk.create({
    name: 'Vonage Backup',
    description: 'Troncal de respaldo',
    provider: 'vonage',
    trunkType: 'pjsip',
    host: 'sip.nexmo.com',
    port: 5060,
    username: 'TU_VONAGE_KEY',
    password: 'TU_VONAGE_SECRET',
    fromUser: '+9876543210',  // Tu número Vonage
    fromDomain: 'sip.nexmo.com',
    maxChannels: 10,
    priority: 2,  // Prioridad secundaria
    status: 'active'
});
```

### Ejemplo: Proveedor Personalizado

```javascript
const customTrunk = await Trunk.create({
    name: 'PSTN Local',
    description: 'Gateway PSTN local',
    provider: 'custom',
    trunkType: 'pjsip',
    host: '192.168.1.100',  // IP del gateway local
    port: 5060,
    username: 'admin',
    password: 'secret',
    fromUser: '1000',
    maxChannels: 8,
    priority: 3,
    status: 'active',
    advancedSettings: {
        codecs: ['alaw', 'ulaw', 'g729'],
        dtmfMode: 'rfc4733',
        nat: 'yes',
        qualify: 'yes'
    }
});
```

---

## Configuración en Asterisk

### 1. Archivo `/etc/asterisk/pjsip.conf`

Para cada troncal creada en la base de datos, debes agregar una configuración correspondiente en Asterisk:

```ini
; Twilio Trunk
[twilio-trunk]
type=registration
outbound_auth=twilio-auth
server_uri=sip:sip.twilio.com
client_uri=sip:TU_ACCOUNT_SID@sip.twilio.com
retry_interval=60

[twilio-auth]
type=auth
auth_type=userpass
username=TU_ACCOUNT_SID
password=TU_AUTH_TOKEN

[twilio-endpoint]
type=endpoint
context=welcomedly-inbound
disallow=all
allow=ulaw,alaw
outbound_auth=twilio-auth
aors=twilio-aor
identify_by=username
direct_media=no

[twilio-aor]
type=aor
contact=sip:sip.twilio.com

[twilio-identify]
type=identify
endpoint=twilio-endpoint
match=54.172.60.0/23
match=54.244.51.0/24
```

### 2. Archivo `/etc/asterisk/extensions.conf`

```ini
[welcomedly-outbound]
; Enrutamiento de llamadas salientes
exten => _X.,1,NoOp(Outbound call to ${EXTEN})
 same => n,Set(TRUNK_ID=${DB(campaign/${CAMPAIGN_ID}/trunk)})
 same => n,GotoIf($["${TRUNK_ID}"="1"]?use-twilio)
 same => n,GotoIf($["${TRUNK_ID}"="2"]?use-vonage)
 same => n,Hangup()

exten => _X.,n(use-twilio),Dial(PJSIP/${EXTEN}@twilio-endpoint,30)
 same => n,Hangup()

exten => _X.,n(use-vonage),Dial(PJSIP/${EXTEN}@vonage-endpoint,30)
 same => n,Hangup()
```

---

## UI de Administración (Pendiente)

### Vista de Lista de Troncales

Mostrará:
- Nombre de la troncal
- Proveedor (con ícono)
- Estado (active/inactive/error con colores)
- Registro (✓ Registrado / ✗ No registrado)
- Canales (ej: "3/20 en uso")
- Success Rate (ej: "98.5%")
- Acciones (Editar, Desactivar, Eliminar, Test)

### Formulario de Creación/Edición

Campos:
1. **Información Básica**
   - Nombre
   - Descripción
   - Proveedor (dropdown)

2. **Configuración SIP**
   - Host
   - Puerto
   - Usuario
   - Contraseña
   - From User
   - From Domain

3. **Capacidad y Enrutamiento**
   - Máximo de canales concurrentes
   - Prioridad (1-100)

4. **Configuración Avanzada** (JSONB)
   - Codecs permitidos
   - Modo DTMF
   - Configuración NAT
   - Qualify

### Dashboard de Monitoreo

Widgets:
- Troncales activas / Total
- Llamadas en curso por troncal (gráfico de barras)
- Success rate por troncal (gráfico de dona)
- Timeline de errores recientes
- Mapa de distribución de llamadas

---

## Integración con Asterisk Manager Interface (AMI)

### Eventos a Escuchar

```javascript
// En TelephonyService
ami.on('registry', (event) => {
    // Evento de registro exitoso/fallido
    const trunk = await Trunk.findByName(event.username);
    if (trunk) {
        if (event.status === 'Registered') {
            await trunk.updateRegistration(true);
        } else {
            await trunk.recordError(event.cause);
        }
    }
});

ami.on('hangup', (event) => {
    // Al colgar, determinar si la llamada fue exitosa
    const call = await Call.findOne({ where: { callId: event.uniqueid } });
    if (call && call.trunkId) {
        const trunk = await Trunk.findByPk(call.trunkId);
        const success = event.cause === '16'; // Normal clearing
        await trunk.recordCall(success);
    }
});
```

---

## Casos de Uso

### 1. Failover Automático

Si la troncal principal falla:
1. El sistema detecta que `registered=false`
2. `Trunk.getBestAvailable()` automáticamente salta a la siguiente troncal por prioridad
3. Las llamadas se enrutan por la troncal de respaldo
4. Se registra el evento en `last_error_at` y `last_error_message`

### 2. Balanceo de Carga por Campaña

Campaña A (alto volumen):
- Troncal Twilio (priority=1, maxChannels=50)
- Troncal Vonage (priority=2, maxChannels=30)

Campaña B (bajo volumen):
- Troncal Local (priority=1, maxChannels=10)

### 3. Control de Costos

Configurar prioridades según tarifas:
1. Troncal interna/local (prioridad 1, costo $0)
2. Troncal proveedor económico (prioridad 2)
3. Troncal proveedor premium (prioridad 3, solo para fallback)

---

## Próximos Pasos

### Fase 1: Backend ✅
- [x] Modelo `Trunk` con asociaciones
- [x] Modelo `CampaignTrunk` para relación many-to-many
- [x] Migración de base de datos
- [x] Métodos de selección y enrutamiento

### Fase 2: Integración con Asterisk (Sprint 3.1.3)
- [ ] Implementar TelephonyService con AMI
- [ ] Escuchar eventos de registro de troncales
- [ ] Implementar lógica de failover
- [ ] Sincronizar estado de troncales con Asterisk

### Fase 3: UI de Administración (Sprint 3.1.4+)
- [ ] Vista de lista de troncales
- [ ] Formulario CRUD de troncales
- [ ] Dashboard de monitoreo
- [ ] Asignación de troncales a campañas
- [ ] Test de conectividad en vivo

### Fase 4: Optimizaciones
- [ ] Encriptación de contraseñas en reposo
- [ ] Cache de selección de troncales
- [ ] Predicción de capacidad
- [ ] Alertas proactivas de fallos

---

## Referencias

- [Asterisk PJSIP Configuration](https://wiki.asterisk.org/wiki/display/AST/Configuring+res_pjsip)
- [Twilio SIP Trunking](https://www.twilio.com/docs/sip-trunking)
- [Vonage SIP Configuration](https://developer.vonage.com/en/voice/sip/overview)
- [FreePBX Trunk Management](https://wiki.freepbx.org/display/FPG/Trunks)
