# Manual de Usuario - Welcomedly
## Plataforma de Gestión de Call Center

**Versión:** 1.0
**Fecha:** Octubre 2025
**Desarrollado por:** Welcomedly Team

---

## Índice

1. [Introducción](#introducción)
2. [Acceso al Sistema](#acceso-al-sistema)
3. [Roles y Permisos](#roles-y-permisos)
4. [Módulos del Sistema](#módulos-del-sistema)
5. [Guía por Rol](#guía-por-rol)
6. [Funcionalidades Avanzadas](#funcionalidades-avanzadas)
7. [Troubleshooting](#troubleshooting)
8. [Glosario](#glosario)

---

## Introducción

### ¿Qué es Welcomedly?

Welcomedly es una plataforma integral de gestión de call center diseñada para optimizar la operación de campañas comerciales, gestionar agentes, realizar seguimiento de llamadas y generar reportes analíticos en tiempo real.

### Características Principales

- ✅ **Gestión de Campañas:** Crear y administrar campañas comerciales
- ✅ **Control de Agentes:** Monitoreo en tiempo real del estado de agentes
- ✅ **Telefonía Integrada:** Sistema WebRTC con troncales SIP
- ✅ **IA Asistente:** Sugerencias inteligentes en tiempo real
- ✅ **Reportes Avanzados:** Analytics y métricas detalladas
- ✅ **Sistema de Disposiciones:** Tipificación completa de llamadas
- ✅ **Dashboard Supervisor:** Monitoreo en tiempo real

### Requisitos del Sistema

**Navegadores compatibles:**
- Google Chrome 90+ (recomendado)
- Mozilla Firefox 88+
- Microsoft Edge 90+
- Safari 14+

**Conexión a Internet:**
- Mínimo: 2 Mbps
- Recomendado: 5 Mbps o superior

**Resolución de pantalla:**
- Mínima: 1366x768
- Recomendada: 1920x1080

---

## Acceso al Sistema

### Registro de Nueva Cuenta

1. **Acceder a la página de registro**
   - URL: `http://localhost:3000/auth/registrarse`
   - Click en "Registrarse" desde la página de login

2. **Completar formulario de registro**

   **Información Personal:**
   - Primer Nombre (requerido)
   - Segundo Nombre (opcional)
   - Primer Apellido (requerido)
   - Segundo Apellido (opcional)
   - Identificación (documento único)

   **Información de Cuenta:**
   - Correo Electrónico (debe ser único)
   - Username (debe ser único)
   - Contraseña (mínimo 6 caracteres)
   - Confirmar Contraseña

   **Rol:**
   - AGENTE: Para operadores de call center
   - ADMIN: Para administradores (solo admin puede crear)

3. **Validaciones automáticas**
   - Email válido
   - Identificación única
   - Username único
   - Contraseñas coinciden

4. **Confirmación**
   - Mensaje de éxito
   - Redirección automática al login

### Iniciar Sesión

1. **Acceder al login**
   - URL: `http://localhost:3000/auth/login`

2. **Credenciales**
   - **Email:** Tu correo electrónico registrado
   - **Contraseña:** Tu contraseña

3. **Primer acceso**
   - Usuario de prueba ADMIN:
     - Email: `admin@test.com`
     - Contraseña: `admin123`

4. **Recuperar contraseña**
   - Click en "¿Olvidaste tu contraseña?"
   - Ingresar email registrado
   - Seguir instrucciones del correo

### Cerrar Sesión

- Click en tu nombre (esquina superior derecha)
- Seleccionar "Cerrar Sesión"
- Confirmación automática

---

## Roles y Permisos

### ROL: ADMIN (Administrador)

**Permisos Completos:**

✅ **Gestión de Usuarios**
- Crear nuevos usuarios (ADMIN y AGENTE)
- Editar información de usuarios
- Activar/Desactivar usuarios
- Ver lista completa de agentes

✅ **Gestión de Campañas**
- Crear nuevas campañas
- Modificar campañas existentes
- Eliminar campañas
- Asignar agentes a campañas
- Cargar base de datos (individual o masiva)

✅ **Gestión de Formularios**
- Crear formularios de tipificación
- Editar formularios
- Eliminar formularios
- Asignar formularios a campañas

✅ **Gestión de Disposiciones**
- Crear códigos de disposición
- Editar disposiciones
- Activar/Desactivar disposiciones
- Configurar callbacks

✅ **Telefonía**
- Crear troncales SIP
- Configurar proveedores
- Gestionar extensiones
- Monitorear llamadas

✅ **Reportes y Analytics**
- Acceso a todos los reportes
- Dashboard de supervisión
- Métricas en tiempo real
- Exportar datos

✅ **Configuración del Sistema**
- Configurar parámetros generales
- Gestionar permisos
- Acceso a logs del sistema

### ROL: AGENTE (Operador)

**Permisos Limitados:**

✅ **Estación de Trabajo**
- Acceso a Agent Workstation
- Cambiar estados (Disponible, Pausa, Offline)
- Gestionar pausas con razones

✅ **Gestión de Llamadas**
- Realizar llamadas salientes
- Recibir llamadas entrantes
- Transferir llamadas
- Poner en espera
- Colgar llamadas

✅ **Tipificación**
- Seleccionar disposición
- Agregar notas
- Programar callbacks
- Guardar interacciones

✅ **IA Asistente**
- Solicitar sugerencias
- Ver análisis de sentimiento
- Copiar respuestas sugeridas

✅ **Métricas Personales**
- Ver sus propias métricas
- Tiempo productivo
- Llamadas realizadas
- Tasa de conversión

❌ **Restricciones:**
- No puede crear campañas
- No puede crear usuarios
- No puede acceder a reportes globales
- No puede modificar configuraciones

---

## Módulos del Sistema

### 1. Market (Inicio)

**Acceso:** Menú lateral > Market (icono de casa)

**Descripción:**
Dashboard principal con acceso rápido a todas las funcionalidades.

**Opciones disponibles:**
- Vista general del sistema
- Acceso rápido a campañas
- Acceso rápido a formularios
- Estadísticas generales

---

### 2. Magicians (Gestión de Agentes)

**Acceso:** Menú lateral > Magicians (icono de usuarios)

#### 2.1 Lista de Agentes

**Funcionalidad:**
- Ver todos los agentes registrados
- Información mostrada:
  - Nombre completo
  - Email
  - Username
  - Estado (Activo/Inactivo)
  - Rol

**Acciones disponibles:**
- 👁️ Ver detalles
- ✏️ Editar información
- 🔴 Activar/Desactivar

#### 2.2 Crear Nuevo Agente

**Pasos:**

1. Click en "Crear Nuevo Agente"

2. Completar formulario:
   ```
   Primer Nombre: [texto]
   Segundo Nombre: [texto] (opcional)
   Primer Apellido: [texto]
   Segundo Apellido: [texto] (opcional)
   Identificación: [único]
   Email: [email válido único]
   Username: [único]
   Contraseña: [mínimo 6 caracteres]
   Confirmar Contraseña: [debe coincidir]
   Rol: [ADMIN o AGENTE]
   ```

3. Click en "Crear Agente"

4. Confirmación:
   - ✅ Mensaje de éxito
   - Redirección a lista de agentes

**Validaciones:**
- Email único
- Username único
- Identificación única
- Contraseñas coinciden
- Campos requeridos completados

#### 2.3 Editar Agente

**Pasos:**

1. Desde lista de agentes, click en icono ✏️

2. Modificar información:
   - Nombres y apellidos
   - Email (debe ser único)
   - Username (debe ser único)
   - Rol
   - Estado

3. Click en "Guardar Cambios"

**Nota:** No se puede editar la contraseña desde aquí (usar recuperar contraseña)

---

### 3. Campañas

**Acceso:** Menú lateral > Campañas (icono de megáfono)

#### 3.1 Ver Campañas

**Información mostrada:**
- Nombre de campaña
- Descripción
- Fecha creación
- Estado (Activa/Inactiva)
- Número de registros
- Agentes asignados
- Formulario asociado

**Acciones:**
- 👁️ Ver detalles
- ✏️ Editar
- 📊 Ver base de datos
- ➕ Agregar registros
- 🗑️ Eliminar

#### 3.2 Crear Nueva Campaña

**Pasos:**

1. Click en "Crear Nueva Campaña"

2. **Información Básica:**
   ```
   Nombre: [texto único]
   Descripción: [texto]
   Objetivo: [texto]
   Tipo: [Venta, Cobranza, Encuesta, etc.]
   ```

3. **Configuración:**
   ```
   Formulario: [seleccionar de lista]
   Agentes: [seleccionar múltiples]
   Disposiciones: [seleccionar aplicables]
   Estado: [Activa/Inactiva]
   ```

4. Click en "Crear Campaña"

5. **Siguiente paso:** Cargar base de datos

#### 3.3 Cargar Base de Datos

**Opción A: Registro Individual**

1. Desde campaña > "Agregar Registro"

2. Completar campos:
   ```
   Nombre: [texto]
   Teléfono: [número]
   Email: [email]
   Otros campos: [según formulario]
   ```

3. Click en "Guardar"

**Opción B: Carga Masiva (Excel)**

1. Desde campaña > "Agregar Registros en Bloque"

2. **Preparar archivo Excel:**
   - Formato: .xlsx o .xls
   - Primera fila: Encabezados
   - Columnas requeridas:
     - nombre
     - telefono
     - email
     - Otros campos personalizados

3. **Subir archivo:**
   - Click en "Seleccionar archivo"
   - Elegir archivo Excel
   - Click en "Cargar"

4. **Validación:**
   - Sistema valida formato
   - Muestra errores si hay
   - Confirma registros válidos

5. **Resultado:**
   - ✅ Registros importados exitosamente
   - ❌ Errores detallados si hay problemas

**Formato Excel ejemplo:**

| nombre | telefono | email | ciudad | producto_interes |
|--------|----------|-------|--------|------------------|
| Juan Pérez | 3001234567 | juan@email.com | Bogotá | Internet |
| María López | 3009876543 | maria@email.com | Medellín | TV |

#### 3.4 Gestionar Campaña

**Ver Base de Datos:**
1. Click en "Ver Base"
2. Tabla con todos los registros
3. Filtros disponibles:
   - Por estado
   - Por agente
   - Por disposición
   - Por fecha

**Editar Campaña:**
1. Click en ✏️
2. Modificar información
3. Reasignar agentes
4. Cambiar formulario
5. Guardar cambios

**Eliminar Campaña:**
1. Click en 🗑️
2. Confirmar eliminación
3. ⚠️ Se eliminan todos los registros asociados

---

### 4. Formularios de Tipificación

**Acceso:** Menú lateral > Market > Formularios

#### 4.1 ¿Qué es un Formulario?

Un formulario de tipificación define los campos personalizados que se capturan durante una llamada o gestión.

**Ejemplos de uso:**
- Formulario "Venta Internet": velocidad, plan, dirección instalación
- Formulario "Cobranza": monto deuda, promesa pago, fecha pago
- Formulario "Encuesta": satisfacción, recomendaría, comentarios

#### 4.2 Crear Formulario

**Pasos:**

1. Click en "Crear Formulario"

2. **Información básica:**
   ```
   Nombre: [texto único]
   Descripción: [texto]
   ```

3. **Agregar campos:**

   Click en "Agregar Campo"

   **Por cada campo configurar:**
   ```
   Nombre del Campo: [texto]
   Tipo: [Texto, Número, Fecha, Select, Checkbox]
   Requerido: [Sí/No]
   Opciones: [si es Select]
   ```

4. **Tipos de campos disponibles:**

   - **Texto:** Input de texto libre
   - **Número:** Solo números
   - **Fecha:** Selector de fecha
   - **Email:** Validación de email
   - **Teléfono:** Validación de teléfono
   - **Select:** Lista desplegable
   - **Checkbox:** Sí/No
   - **Textarea:** Texto largo

5. **Ejemplo de formulario:**

   ```
   Nombre: Venta Internet
   Descripción: Formulario para ventas de internet

   Campos:
   1. Velocidad Deseada (Select) - Requerido
      Opciones: 100MB, 200MB, 500MB, 1GB

   2. Dirección Instalación (Texto) - Requerido

   3. Fecha Instalación (Fecha) - Requerido

   4. Acepta Términos (Checkbox) - Requerido

   5. Observaciones (Textarea) - No requerido
   ```

6. Click en "Guardar Formulario"

#### 4.3 Editar Formulario

**Pasos:**
1. Lista de formularios > Click en ✏️
2. Modificar campos
3. Agregar nuevos campos
4. Eliminar campos no usados
5. Guardar cambios

**⚠️ Advertencia:**
Cambios afectan todas las campañas que usen este formulario.

#### 4.4 Eliminar Formulario

**Restricción:**
No se puede eliminar si está asignado a una campaña activa.

**Pasos:**
1. Verificar que no esté en uso
2. Click en 🗑️
3. Confirmar eliminación

---

### 5. Disposiciones

**Acceso:** Menú lateral > Disposiciones

#### 5.1 ¿Qué son las Disposiciones?

Códigos de tipificación que indican el resultado de una gestión o llamada.

**Tipos de disposiciones:**

1. **EXITOSA**
   - Venta realizada
   - Objetivo cumplido
   - Cliente satisfecho
   - Problema resuelto

2. **NO_CONTACTO**
   - No contesta
   - Número equivocado
   - Buzón de voz
   - Teléfono ocupado
   - Fuera de servicio

3. **SEGUIMIENTO**
   - Enviar información
   - Volver a llamar
   - Programar callback
   - Solicitar cotización

4. **NO_EXITOSA**
   - No interesado
   - Ya tiene el servicio
   - No califica
   - Rechaza oferta

#### 5.2 Crear Disposición

**Pasos:**

1. Click en "Crear Disposición"

2. **Completar formulario:**
   ```
   Código: [texto único, ej: VENTA_EXITOSA]
   Nombre: [texto, ej: Venta Exitosa]
   Descripción: [texto descriptivo]
   Tipo: [EXITOSA/NO_CONTACTO/SEGUIMIENTO/NO_EXITOSA]
   Requiere Callback: [Sí/No]
   Estado: [Activa/Inactiva]
   ```

3. **Si requiere callback:**
   - Se habilitarán campos de fecha/hora
   - Campo de notas de callback

4. Click en "Guardar"

**Ejemplos de disposiciones:**

```
Código: VENTA_REALIZADA
Nombre: Venta Realizada
Tipo: EXITOSA
Requiere Callback: No
Descripción: Cliente realizó compra exitosamente

---

Código: NO_CONTESTA
Nombre: No Contesta
Tipo: NO_CONTACTO
Requiere Callback: Sí
Descripción: Cliente no contesta, programar rellamada

---

Código: ENVIAR_INFO
Nombre: Enviar Información
Tipo: SEGUIMIENTO
Requiere Callback: Sí
Descripción: Cliente solicita información por email
```

#### 5.3 Gestionar Disposiciones

**Lista de Disposiciones:**
- Ver todas las disposiciones creadas
- Filtrar por tipo
- Ver estado (Activa/Inactiva)

**Editar:**
1. Click en ✏️
2. Modificar campos
3. Guardar cambios

**Activar/Desactivar:**
- Toggle de estado
- Disposiciones inactivas no aparecen en selección

**Eliminar:**
- Solo si no está en uso
- Confirmación requerida

#### 5.4 Asignar a Campañas

**Desde Crear/Editar Campaña:**
1. Sección "Disposiciones"
2. Seleccionar aplicables
3. Guardar

**Recomendación:**
Asignar solo disposiciones relevantes para cada campaña.

---

### 6. Troncales SIP (Telefonía)

**Acceso:** Menú lateral > Trunks

#### 6.1 ¿Qué es una Troncal SIP?

Conexión con proveedor de telefonía para realizar/recibir llamadas VoIP.

**Información requerida del proveedor:**
- Host/IP del servidor SIP
- Puerto (generalmente 5060)
- Usuario/Extension
- Contraseña
- Protocolo (UDP/TCP/TLS)

#### 6.2 Crear Troncal SIP

**Pasos:**

1. Click en "Crear Troncal"

2. **Configuración Básica:**
   ```
   Nombre: [identificador único]
   Proveedor: [nombre del carrier]
   Estado: [Activa/Inactiva]
   ```

3. **Configuración SIP:**
   ```
   Host: [IP o dominio]
   Puerto: [5060]
   Usuario: [username]
   Contraseña: [password]
   Extension: [número]
   ```

4. **Configuración Avanzada:**
   ```
   Protocolo: [UDP/TCP/TLS]
   Codec: [G711, G729, etc]
   DTMF Mode: [RFC2833, INBAND, SIP INFO]
   Timeout: [30 segundos]
   ```

5. Click en "Guardar"

6. **Probar conexión:**
   - Click en "Probar Conexión"
   - Verifica estado: ✅ Conectado / ❌ Error

#### 6.3 Gestionar Troncales

**Lista de Troncales:**
- Ver todas configuradas
- Estado de conexión
- Última actualización

**Acciones:**
- 👁️ Ver detalles
- ✏️ Editar configuración
- 🔌 Probar conexión
- 🗑️ Eliminar

**Test de Conexión:**
1. Click en "Test"
2. Sistema verifica:
   - Conectividad de red
   - Autenticación SIP
   - Registro exitoso
3. Resultado:
   - ✅ Conexión exitosa
   - ❌ Error con detalles

---

### 7. Agent Workstation (Estación de Trabajo)

**Acceso:** Menú lateral > Agent (icono de auriculares)

#### 7.1 Vista General

**Distribución de la pantalla:**

```
┌─────────────────────────────────────────────────┐
│  [Panel Izquierdo]  │  [Panel Central]         │
│                     │                           │
│  - Estado Actual    │  - Cliente Actual        │
│  - Contadores       │  - Panel de Llamada      │
│  - Métricas         │  - Asistente IA          │
│                     │  - Disposiciones         │
└─────────────────────────────────────────────────┘
```

#### 7.2 Panel de Estado

**Estados disponibles:**

1. **Disponible (Verde)**
   - Listo para recibir llamadas
   - Puede hacer llamadas salientes
   - Tiempo cuenta como productivo

2. **En Pausa (Amarillo)**
   - No recibe llamadas
   - Debe seleccionar tipo de pausa:
     - Baño
     - Break
     - Almuerzo
     - Coaching
     - Problemas Técnicos
     - Personal
   - Puede agregar razón opcional
   - Tiempo cuenta como pausa

3. **Offline (Gris)**
   - Desconectado del sistema
   - No disponible para llamadas
   - Fin de jornada

**Cambiar estado:**

1. Click en botón del estado deseado

2. **Para Pausa:**
   ```
   - Seleccionar tipo de pausa
   - (Opcional) Agregar razón
   - Click en "Iniciar Pausa"
   ```

3. **Finalizar Pausa:**
   ```
   - Click en "Disponible"
   - Sistema registra duración
   ```

#### 7.3 Contadores

**Tiempo Productivo:**
- ⏱️ Tiempo en estado "Disponible"
- ⏱️ Tiempo en llamadas
- Formato: HH:MM:SS
- Se actualiza en tiempo real

**Tiempo en Pausa:**
- ⏸️ Tiempo acumulado en pausas
- Desglose por tipo de pausa
- Formato: HH:MM:SS

**Tiempo Total:**
- 🕐 Desde inicio de sesión
- Incluye todo el tiempo conectado

#### 7.4 Métricas del Día

**Llamadas:**
- 📞 Total llamadas realizadas
- ✅ Llamadas contestadas
- 📊 Tasa de respuesta (%)

**Duración:**
- ⏱️ Duración promedio de llamadas
- ⏱️ Tiempo total en llamadas

**Resultados:**
- 💰 Ventas realizadas
- ⭐ Puntuación de calidad
- 😊 Satisfacción del cliente

#### 7.5 Realizar Llamada

**Pasos:**

1. **Panel de llamada aparece**
   - Información del cliente
   - Número a marcar
   - Historial de contactos

2. **Click en "Contestar" o "Llamar"**

3. **Durante la llamada:**
   ```
   Controles disponibles:
   - 📞 Colgar
   - ⏸️ Esperar (Hold)
   - 🔄 Transferir
   - 🔊 Volumen
   ```

4. **Información mostrada:**
   - Nombre del cliente
   - Teléfono
   - Email
   - Última interacción
   - Historial de contactos

5. **Duración de llamada:**
   - Contador en tiempo real
   - Calidad de la conexión
   - Estado del dispositivo

#### 7.6 Tipificar Llamada

**Al finalizar la llamada:**

1. **Panel de Disposiciones aparece**

2. **Seleccionar disposición:**
   ```
   - Lista de disposiciones disponibles
   - Agrupadas por tipo
   - Descripción visible
   ```

3. **Completar notas:**
   ```
   Notas de la llamada: [texto libre]
   - Resumen de la conversación
   - Acuerdos alcanzados
   - Observaciones importantes
   ```

4. **Si requiere callback:**
   ```
   Fecha: [selector de fecha]
   Hora: [selector de hora]
   Notas callback: [texto]
   ```

5. **Click en "Guardar Disposición"**

6. **Confirmación:**
   - ✅ Disposición guardada
   - Sistema listo para siguiente llamada

#### 7.7 Asistente IA

**Ubicación:** Panel derecho de la estación

**Funcionalidades:**

1. **Solicitar Sugerencias**
   ```
   - Click en "Solicitar Sugerencias"
   - IA analiza contexto de llamada
   - Muestra 3 sugerencias personalizadas
   - Click en sugerencia para copiar
   ```

2. **Análisis de Sentimiento**
   ```
   - Indicador visual de sentimiento:
     🟢 Positivo (cliente satisfecho)
     🔴 Negativo (cliente molesto)
     ⚪ Neutral
   - Barra de confianza (%)
   ```

3. **Sugerencias Típicas:**
   - Mantén tono profesional
   - Escucha activa del cliente
   - Ofrece soluciones personalizadas
   - Confirma acuerdos alcanzados

4. **Usar Sugerencias:**
   - Click en cualquier sugerencia
   - Se copia automáticamente
   - Úsala como guía en la conversación

---

### 8. Dashboard Supervisor

**Acceso:** Menú lateral > Dashboard (solo ADMIN)

#### 8.1 Vista en Tiempo Real

**Información mostrada:**

**Resumen General:**
```
┌─────────────────────────────────────┐
│ Agentes Conectados: 15              │
│ En Llamada: 8                       │
│ Disponibles: 5                      │
│ En Pausa: 2                         │
└─────────────────────────────────────┘
```

**Tabla de Agentes:**
| Agente | Estado | Tiempo Estado | Última Llamada | Llamadas Hoy |
|--------|--------|---------------|----------------|--------------|
| Juan P. | 📞 En llamada | 00:05:23 | 10:15 AM | 12 |
| María L. | ✅ Disponible | 00:02:10 | 10:30 AM | 15 |
| Carlos R. | ⏸️ En pausa | 00:10:05 | 10:20 AM | 8 |

**Actualización:**
- Automática cada 5 segundos
- WebSocket en tiempo real
- Sin necesidad de refrescar

#### 8.2 Métricas del Día

**KPIs Principales:**
```
📊 Total Llamadas: 245
✅ Tasa Respuesta: 87%
⏱️ Tiempo Promedio: 5:23
💰 Conversiones: 45
⭐ Calidad Promedio: 4.2/5
```

**Gráficos:**
- Llamadas por hora
- Distribución de estados
- Conversiones por agente
- Tendencias del día

#### 8.3 Alertas

**Alertas Automáticas:**

🔴 **Pausa Prolongada:**
```
Agente: María López
Tipo: Break
Duración: 25 minutos
Acción: Notificar supervisor
```

🟡 **Baja Tasa de Respuesta:**
```
Agente: Carlos Ruiz
Tasa: 65% (objetivo: 80%)
Acción: Coaching recomendado
```

🔴 **Sin Actividad:**
```
Agente: Juan Pérez
Última llamada: 30 minutos
Estado: Disponible
Acción: Verificar disponibilidad
```

#### 8.4 Monitoreo Individual

**Pasos:**

1. Click en agente específico

2. **Información detallada:**
   ```
   - Estado actual
   - Tiempo en estado
   - Llamadas del día
   - Disposiciones usadas
   - Tiempo productivo vs pausa
   - Métricas de calidad
   ```

3. **Acciones disponibles:**
   - 👁️ Ver detalle completo
   - 💬 Enviar mensaje
   - 📊 Ver reportes históricos

---

### 9. Reportes

**Acceso:** Menú lateral > Reportes

#### 9.1 Reportes de Agentes

**Tipos de reportes:**

**A. Reporte Individual**
```
Agente: [Seleccionar]
Período: [Hoy / Semana / Mes / Personalizado]

Métricas:
- Tiempo productivo
- Tiempo en pausa (desglosado)
- Llamadas realizadas
- Llamadas atendidas
- Tasa de conversión
- Disposiciones usadas
- Calidad promedio
- Satisfacción cliente
```

**B. Reporte Comparativo**
```
Comparar agentes en período seleccionado
- Ranking por llamadas
- Ranking por conversiones
- Ranking por calidad
- Tabla comparativa completa
```

**C. Reporte de Pausas**
```
Análisis de pausas por agente:
- Total tiempo en pausa
- Desglose por tipo
- Pausas prolongadas
- Frecuencia de pausas
```

**Exportar:**
- 📄 PDF
- 📊 Excel
- 📧 Email

#### 9.2 Reportes de Campañas

**Información disponible:**

**A. Reporte General de Campaña**
```
Campaña: [Seleccionar]
Período: [Fechas]

Métricas:
- Total registros
- Contactados
- Pendientes
- Disposiciones (distribución)
- Conversiones
- Tasa de éxito
- Agentes participantes
- Tiempo promedio gestión
```

**B. Reporte de Base de Datos**
```
Estado de registros:
- Pendientes: 150
- En gestión: 25
- Contactados: 320
- No contactados: 80
- Callbacks programados: 45
```

**C. Reporte de Disposiciones**
```
Distribución por tipo:
- EXITOSA: 35% (175 registros)
- SEGUIMIENTO: 25% (125 registros)
- NO_CONTACTO: 30% (150 registros)
- NO_EXITOSA: 10% (50 registros)
```

**Filtros:**
- Por agente
- Por disposición
- Por fecha
- Por estado

**Exportar:**
- 📄 PDF completo
- 📊 Excel detallado
- 📧 Programar envío automático

---

## Guía por Rol

### Flujo de Trabajo: ADMIN

**Setup Inicial del Sistema**

1. **Crear Disposiciones**
   ```
   ➜ Disposiciones > Crear
   ➜ Definir todas las disposiciones necesarias
   ➜ Activar las que se usarán
   ```

2. **Crear Formularios**
   ```
   ➜ Market > Formularios > Crear
   ➜ Diseñar campos de tipificación
   ➜ Guardar formulario
   ```

3. **Configurar Troncales**
   ```
   ➜ Trunks > Crear
   ➜ Configurar conexión SIP
   ➜ Probar conexión
   ```

4. **Crear Agentes**
   ```
   ➜ Magicians > Crear Agente
   ➜ Completar información
   ➜ Asignar rol AGENTE
   ➜ Guardar
   ```

**Crear y Lanzar Campaña**

1. **Crear Campaña**
   ```
   ➜ Campañas > Crear Nueva
   ➜ Nombre y descripción
   ➜ Seleccionar formulario
   ➜ Asignar agentes
   ➜ Seleccionar disposiciones
   ➜ Activar campaña
   ```

2. **Cargar Base de Datos**
   ```
   Opción A (Individual):
   ➜ Campaña > Agregar Registro
   ➜ Completar datos
   ➜ Guardar

   Opción B (Masiva):
   ➜ Campaña > Agregar en Bloque
   ➜ Subir Excel
   ➜ Validar y confirmar
   ```

3. **Monitorear**
   ```
   ➜ Dashboard Supervisor
   ➜ Ver agentes en tiempo real
   ➜ Revisar métricas
   ➜ Atender alertas
   ```

4. **Generar Reportes**
   ```
   ➜ Reportes > Campañas
   ➜ Seleccionar campaña
   ➜ Definir período
   ➜ Generar y exportar
   ```

**Tareas Diarias del ADMIN**

```
9:00 AM  - Revisar Dashboard
         - Verificar agentes conectados
         - Revisar pendientes del día anterior

10:00 AM - Monitorear operación en tiempo real
         - Atender alertas
         - Apoyar a agentes

12:00 PM - Revisar métricas matutinas
         - Ajustar estrategias si necesario

3:00 PM  - Seguimiento de campañas
         - Verificar avance de objetivos

5:00 PM  - Generar reportes del día
         - Analizar resultados
         - Planear día siguiente
```

### Flujo de Trabajo: AGENTE

**Inicio de Jornada**

1. **Login**
   ```
   ➜ Acceder al sistema
   ➜ Ir a Agent Workstation
   ```

2. **Conectarse**
   ```
   ➜ Cambiar estado a "Disponible"
   ➜ Verificar conexión telefónica
   ➜ Revisar campañas asignadas
   ```

**Durante Operación**

1. **Recibir/Realizar Llamada**
   ```
   ➜ Sistema muestra información cliente
   ➜ Click en "Contestar" o sistema marca
   ➜ Conversar con cliente
   ➜ Usar sugerencias de IA si necesario
   ```

2. **Tipificar**
   ```
   ➜ Al finalizar llamada
   ➜ Seleccionar disposición
   ➜ Completar notas
   ➜ Programar callback si aplica
   ➜ Guardar
   ```

3. **Pausas**
   ```
   ➜ Cuando necesite pausa
   ➜ Click en "Pausa"
   ➜ Seleccionar tipo
   ➜ Agregar razón (opcional)
   ➜ Al regresar: "Disponible"
   ```

4. **Usar IA Asistente**
   ```
   ➜ Durante llamada complicada
   ➜ Click "Solicitar Sugerencias"
   ➜ Revisar sugerencias
   ➜ Aplicar según contexto
   ```

**Fin de Jornada**

```
➜ Completar llamadas pendientes
➜ Tipificar todas las interacciones
➜ Cambiar estado a "Offline"
➜ Cerrar sesión
```

**Mejores Prácticas para Agentes**

✅ **Hacer:**
- Tipificar inmediatamente después de llamada
- Usar notas detalladas
- Programar callbacks con fechas realistas
- Mantener estado actualizado
- Usar pausas apropiadamente
- Aprovechar sugerencias de IA

❌ **Evitar:**
- Dejar registros sin tipificar
- Pausas prolongadas sin razón
- Olvidar programar callbacks
- Notas vagas o incompletas
- Cambiar a offline sin terminar gestiones

---

## Funcionalidades Avanzadas

### 1. Sistema de Recuperación de Sesión

**Funcionalidad:** Reconexión automática en caso de pérdida de conexión

**Características:**
- Reconexión automática con backoff exponencial
- Máximo 10 intentos de reconexión
- Grace period de 30 segundos
- Preserva estado y métricas
- Modal visual con progreso

**Modal de Reconexión:**
```
╔════════════════════════════════╗
║    Conexión Perdida            ║
║                                ║
║  [🔄 Spinner animado]          ║
║                                ║
║  Intentando reconectar...      ║
║  Intento 3/10                  ║
║  Próximo intento en 4s         ║
║                                ║
║  [Reintentar Ahora]            ║
╚════════════════════════════════╝
```

**Delays de reconexión:**
- Intento 1: 1 segundo
- Intento 2: 2 segundos
- Intento 3: 4 segundos
- Intento 4: 8 segundos
- Intento 5: 16 segundos
- Intentos 6-10: 30 segundos

**¿Qué hacer si pierdes conexión?**
1. Esperar reconexión automática
2. Si no reconecta, click "Reintentar Ahora"
3. Si falla todo, recargar página
4. Tus datos están guardados

### 2. WebSocket en Tiempo Real

**Funcionalidad:** Comunicación bidireccional instantánea

**Eventos automáticos:**
- Cambios de estado de agentes
- Nuevas llamadas
- Actualizaciones de dashboard
- Notificaciones del sistema
- Sugerencias de IA

**Indicador de conexión:**
```
🟢 Conectado - WebSocket activo
🔴 Desconectado - Reconectando...
🟡 Conectando...
```

**Heartbeat:**
- Ping cada 30 segundos
- Mantiene conexión activa
- Detecta desconexiones

### 3. Asistente IA Avanzado

**Análisis en Tiempo Real:**

**A. Sugerencias Contextuales**
```
Contexto detectado: Cliente molesto
Sentimiento: Negativo (85%)

Sugerencias:
1. "Entiendo su frustración, trabajaré para resolverlo"
2. "Déjeme escalarlo a mi supervisor inmediatamente"
3. "Le ofrezco un descuento del 20% como compensación"
```

**B. Análisis de Sentimiento**
```
😊 Positivo (75% confianza)
Cliente usa: "excelente", "gracias", "perfecto"
Acción sugerida: Ofrecer upgrade, solicitar referido

😐 Neutral (60% confianza)
Cliente pregunta, no muestra emoción fuerte
Acción sugerida: Proveer información clara

😠 Negativo (80% confianza)
Cliente usa: "problema", "molesto", "cancelar"
Acción sugerida: Escalar, ofrecer compensación
```

**C. Transcripción (Futuro)**
```
[Preparado para integración]
- Speech-to-text en tiempo real
- Reconocimiento de palabras clave
- Alertas automáticas
```

**Configuración de IA:**

Para administradores, agregar en `.env`:
```bash
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=500
AI_FEATURES_ENABLED=true
```

### 4. Sistema de Callbacks

**Programar Callback:**

1. Durante tipificación, si disposición requiere callback:
   ```
   Fecha Callback: [Selector]
   Hora: [HH:MM]
   Notas: [Texto]
   ```

2. Sistema registra:
   - Fecha y hora programada
   - Agente que programa
   - Notas del callback
   - Cliente asociado

**Gestión de Callbacks:**

**Panel de Callbacks (Vista Agente):**
```
Callbacks Programados Hoy:

10:00 AM - Juan Pérez (3001234567)
         Notas: Enviar cotización por email

2:00 PM  - María López (3009876543)
         Notas: Cliente viaja, disponible después de 2pm

4:30 PM  - Carlos Ruiz (3005556789)
         Notas: Espera aprobación del gerente
```

**Alertas:**
- 15 minutos antes: Notificación
- A la hora: Alerta visual + sonido
- Pasada la hora: Marcado como vencido

**Dashboard Supervisor:**
```
Callbacks del Día:
- Programados: 45
- Completados: 30
- Pendientes: 10
- Vencidos: 5 ⚠️
```

### 5. Reportes Personalizados

**Crear Reporte Personalizado:**

1. Seleccionar tipo base
2. Configurar filtros:
   ```
   Período: [Desde - Hasta]
   Agentes: [Todos / Seleccionar]
   Campañas: [Todas / Seleccionar]
   Disposiciones: [Todas / Seleccionar]
   ```

3. Seleccionar métricas:
   ```
   ☑ Llamadas realizadas
   ☑ Tiempo productivo
   ☑ Tasa de conversión
   ☑ Calidad promedio
   ☑ Distribución de disposiciones
   ☐ Tiempo en pausas
   ☑ Callbacks programados
   ```

4. Formato de salida:
   - PDF (reporte ejecutivo)
   - Excel (datos detallados)
   - CSV (importar a otros sistemas)

5. Programar envío:
   ```
   Frecuencia: [Diario / Semanal / Mensual]
   Hora: [HH:MM]
   Destinatarios: [Emails]
   ```

---

## Troubleshooting

### Problemas Comunes

#### 1. No puedo iniciar sesión

**Síntomas:**
- Credenciales rechazadas
- Error de autenticación

**Soluciones:**
```
✓ Verificar email correcto
✓ Verificar contraseña (sensible a mayúsculas)
✓ Usar "Recuperar contraseña" si olvidaste
✓ Verificar cuenta activa con administrador
✓ Limpiar caché del navegador
✓ Probar en modo incógnito
```

#### 2. WebSocket no conecta

**Síntomas:**
- No se actualizan métricas en tiempo real
- Dashboard estático
- Indicador rojo de conexión

**Soluciones:**
```
✓ Verificar conexión a internet
✓ Recargar página (F5)
✓ Verificar firewall/proxy no bloquea WebSocket
✓ Probar en otro navegador
✓ Contactar soporte técnico
```

#### 3. No aparecen sugerencias de IA

**Síntomas:**
- Panel IA vacío
- Botón no responde
- Error al solicitar

**Soluciones:**
```
✓ Verificar OPENAI_API_KEY configurada (admin)
✓ Verificar conexión a internet
✓ Esperar unos segundos (API puede tardar)
✓ Recargar página
✓ Revisar logs del sistema (admin)
```

#### 4. Llamadas no conectan

**Síntomas:**
- No se escucha audio
- Llamada cuelga inmediatamente
- Error de troncal

**Soluciones:**
```
✓ Verificar permisos de micrófono en navegador
✓ Verificar troncal SIP activa (admin)
✓ Probar conexión de troncal
✓ Verificar extensión configurada
✓ Reiniciar navegador
✓ Verificar conexión a internet
```

#### 5. Pérdida de sesión frecuente

**Síntomas:**
- Sesión expira constantemente
- Redirección a login

**Soluciones:**
```
✓ Verificar cookies habilitadas
✓ No usar modo incógnito
✓ Verificar tiempo de sesión (admin)
✓ No cerrar todas las pestañas
✓ Mantener pestaña activa
```

#### 6. Excel no se carga

**Síntomas:**
- Error al cargar archivo
- Registros no importan

**Soluciones:**
```
✓ Verificar formato .xlsx o .xls
✓ Verificar encabezados correctos
✓ Verificar no haya celdas vacías en campos requeridos
✓ Verificar formato de teléfonos (solo números)
✓ Verificar formato de emails válido
✓ Reducir tamaño si es muy grande (max 1000 registros)
```

#### 7. Modal de reconexión infinito

**Síntomas:**
- Modal no desaparece
- Reconexión falla siempre

**Soluciones:**
```
✓ Click en "Reintentar Ahora"
✓ Verificar conexión a internet
✓ Recargar página completamente (Ctrl + F5)
✓ Limpiar caché y cookies
✓ Verificar servidor activo (admin)
```

### Códigos de Error

| Código | Mensaje | Solución |
|--------|---------|----------|
| AUTH_001 | Credenciales inválidas | Verificar email y contraseña |
| AUTH_002 | Sesión expirada | Volver a iniciar sesión |
| WS_001 | WebSocket desconectado | Esperar reconexión automática |
| AI_001 | API Key no configurada | Contactar administrador |
| SIP_001 | Troncal no disponible | Verificar configuración |
| DB_001 | Error de base de datos | Contactar soporte |

### Contacto de Soporte

**Soporte Técnico:**
- Email: soporte@welcomedly.com
- Teléfono: +57 1 234 5678
- Horario: Lunes a Viernes, 8AM - 6PM

**Soporte Urgente (24/7):**
- WhatsApp: +57 300 123 4567
- Nivel de servicio: 1 hora respuesta

**Reportar Bug:**
- GitHub Issues: github.com/welcomedly/issues
- Email: bugs@welcomedly.com

---

## Glosario

**Agente:** Usuario operador del sistema que realiza gestiones y llamadas

**Callback:** Llamada programada para fecha/hora futura

**Campaña:** Conjunto de registros a gestionar con objetivo específico

**Disposición:** Código de tipificación del resultado de una gestión

**Formulario:** Plantilla de campos para capturar información

**Grace Period:** Período de tolerancia antes de marcar agente offline (30s)

**KPI:** Key Performance Indicator (Indicador Clave de Desempeño)

**SIP:** Session Initiation Protocol (protocolo de telefonía VoIP)

**Troncal:** Conexión con proveedor de telefonía para realizar llamadas

**Tipificación:** Proceso de clasificar resultado de una gestión

**WebRTC:** Web Real-Time Communication (tecnología de llamadas en navegador)

**WebSocket:** Protocolo de comunicación bidireccional en tiempo real

**Workstation:** Estación de trabajo del agente

---

## Apéndices

### A. Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `Ctrl + D` | Cambiar a Disponible |
| `Ctrl + P` | Iniciar Pausa |
| `Ctrl + O` | Cambiar a Offline |
| `Ctrl + S` | Guardar Disposición |
| `Ctrl + I` | Solicitar Sugerencias IA |
| `Esc` | Cerrar Modal |
| `F5` | Recargar Página |

### B. Niveles de Acceso

| Funcionalidad | ADMIN | AGENTE |
|---------------|-------|--------|
| Crear Campañas | ✅ | ❌ |
| Ver Campañas Asignadas | ✅ | ✅ |
| Crear Usuarios | ✅ | ❌ |
| Crear Formularios | ✅ | ❌ |
| Crear Disposiciones | ✅ | ❌ |
| Configurar Troncales | ✅ | ❌ |
| Agent Workstation | ✅ | ✅ |
| Realizar Llamadas | ✅ | ✅ |
| Tipificar | ✅ | ✅ |
| IA Asistente | ✅ | ✅ |
| Dashboard Supervisor | ✅ | ❌ |
| Reportes Globales | ✅ | ❌ |
| Reportes Personales | ✅ | ✅ |

### C. Especificaciones Técnicas

**Backend:**
- Node.js 18+
- Express 5
- PostgreSQL 14+
- Redis 7+

**Frontend:**
- Bootstrap 5
- jQuery 3.6+
- Socket.IO Client 4+
- SweetAlert2 11+

**Telefonía:**
- SIP.js 0.21+
- WebRTC
- Protocolos: UDP, TCP, TLS

**IA:**
- OpenAI GPT-4
- Google Cloud Speech-to-Text
- Natural NLP

---

## Fin del Manual

**Versión:** 1.0
**Última actualización:** Octubre 2025
**Próxima revisión:** Enero 2026

Para sugerencias de mejora de este manual:
📧 docs@welcomedly.com

---

© 2025 Welcomedly. Todos los derechos reservados.
