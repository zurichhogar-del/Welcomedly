# Sprint 3.3: Reportes y Analytics Avanzados

## ✅ Estado: COMPLETADO

**Fecha Inicio:** 25 de Octubre 2025
**Duración:** 1 día
**Prioridad:** ⭐ ALTA - Visibilidad de métricas críticas

---

## 📋 Tareas Completadas

### ✅ 1. Modelos de Datos para Time-Series

**Archivos Creados:**
- `src/models/AgentMetric.js` - Modelo de métricas de agentes
- `src/models/CampaignMetric.js` - Modelo de métricas de campañas

**Funcionalidad:**

#### AgentMetric
Almacena snapshots de métricas de agentes con:
- Timestamp de la métrica
- Estado del agente (DISPONIBLE, EN_LLAMADA, PAUSADO, etc.)
- Tiempo productivo y en pausa (en segundos)
- Llamadas atendidas y ventas realizadas
- Duración promedio de llamadas
- Tiempo total en llamadas

**Tabla:** `agent_metrics`

**Campos principales:**
```javascript
{
    agenteId: INTEGER,
    timestamp: TIMESTAMP,
    status: ENUM,
    productiveTime: INTEGER,
    pauseTime: INTEGER,
    callsHandled: INTEGER,
    salesCount: INTEGER,
    avgCallDuration: INTEGER,
    totalTalkTime: INTEGER
}
```

**Índices:**
- `agente_id` - Para búsquedas por agente
- `timestamp` - Para consultas por rango de fechas
- `(agente_id, timestamp)` - Índice compuesto para queries optimizadas

#### CampaignMetric
Almacena snapshots de métricas de campañas con:
- Timestamp de la métrica
- Total de leads y contactados
- Llamadas exitosas y fallidas
- Tasa de conversión
- Duración promedio de llamadas
- Agentes activos

**Tabla:** `campaign_metrics`

**Campos principales:**
```javascript
{
    campanaId: INTEGER,
    timestamp: TIMESTAMP,
    totalLeads: INTEGER,
    contactedLeads: INTEGER,
    successfulCalls: INTEGER,
    failedCalls: INTEGER,
    conversionRate: DECIMAL(5,2),
    avgCallDuration: INTEGER,
    totalCallTime: INTEGER,
    activeAgents: INTEGER
}
```

**Índices:**
- `campana_id` - Para búsquedas por campaña
- `timestamp` - Para consultas por rango de fechas
- `(campana_id, timestamp)` - Índice compuesto

---

### ✅ 2. Servicio de Analytics

**Archivo:** `src/services/analyticsService.js`

**Métodos Implementados:**

#### 1. `getAgentMetrics(agenteId, startDate, endDate)`
Calcula métricas en tiempo real de un agente:
- Total de llamadas y contestadas
- Tasa de respuesta
- Tiempo productivo, en pausa y en llamadas
- Ventas y tasa de conversión
- Estado actual del agente

**Retorna:**
```javascript
{
    agenteId: 1,
    period: { start, end },
    status: "DISPONIBLE",
    calls: {
        total: 45,
        answered: 38,
        answerRate: "84.44"
    },
    time: {
        productive: 28800,
        pause: 1800,
        talk: 6840,
        avgCallDuration: 180
    },
    sales: {
        count: 12,
        conversionRate: "31.58"
    }
}
```

#### 2. `getCampaignMetrics(campanaId, startDate, endDate)`
Calcula métricas de una campaña:
- Total de leads y contactados
- Tasa de contacto
- Llamadas exitosas y fallidas
- Tasa de conversión
- Tiempo total y promedio de llamadas
- Agentes activos

#### 3. `compareAgents(startDate, endDate)`
Compara métricas de todos los agentes activos:
- Ordena por total de llamadas (descendente)
- Incluye nombre, email y todas las métricas
- Útil para ranking de performance

#### 4. `getAgentHourlyMetrics(agenteId, date)`
Análisis de productividad por hora:
- Agrupa llamadas por hora del día (0-23)
- Cuenta total de llamadas y contestadas por hora
- Calcula duración promedio por hora
- Identifica horas pico de productividad

#### 5. `saveAgentMetricSnapshot(agenteId)`
Guarda snapshot de métricas del día actual:
- Ejecutable periódicamente (cron job)
- Almacena en tabla `agent_metrics`
- Permite análisis de tendencias históricos

#### 6. `saveCampaignMetricSnapshot(campanaId)`
Guarda snapshot de métricas de campaña:
- Similar a agent snapshot
- Almacena en tabla `campaign_metrics`

#### 7. `getAgentTrend(agenteId, startDate, endDate)`
Obtiene tendencia histórica de métricas de agente:
- Retorna datos de snapshots guardados
- Útil para gráficos de línea de tendencia

#### 8. `getCampaignTrend(campanaId, startDate, endDate)`
Obtiene tendencia histórica de campaña:
- Retorna evolución de métricas en el tiempo

---

### ✅ 3. Controlador de Analytics

**Archivo:** `src/controllers/analyticsController.js`

**Endpoints Implementados:**

#### Vista Principal
- `GET /analytics/dashboard` - Renderiza dashboard de analytics

#### APIs de Agentes
- `GET /analytics/api/agent/:agentId` - Métricas de agente
- `GET /analytics/api/agent/:agentId/hourly` - Métricas por hora
- `GET /analytics/api/agent/:agentId/trend` - Tendencia histórica
- `GET /analytics/api/agents/compare` - Comparación de agentes

**Query Params:** `startDate`, `endDate` (ISO 8601)

#### APIs de Campañas
- `GET /analytics/api/campaign/:campaignId` - Métricas de campaña
- `GET /analytics/api/campaign/:campaignId/trend` - Tendencia histórica

**Query Params:** `startDate`, `endDate`

#### Exportación a CSV
- `GET /analytics/export/agents/csv` - Exporta comparación de agentes
- `GET /analytics/export/campaign/:campaignId/csv` - Exporta métricas de campaña

**Características de Exportación:**
- Headers configurados para descarga automática
- Nombres de archivo con timestamp
- Formato CSV compatible con Excel
- Usa librería `json2csv` para conversión

**Ejemplo de nombre de archivo:**
```
reporte-agentes-2025-10-25.csv
reporte-campana-5-2025-10-25.csv
```

---

### ✅ 4. Rutas de Analytics

**Archivo:** `src/routes/analyticsRoutes.js`

**Configuración:**
- Protegidas con `requireAuth` middleware
- Base path: `/analytics`
- Integradas en `src/routes/index.js`

**Rutas Registradas:**
```javascript
GET  /analytics/dashboard
GET  /analytics/api/agent/:agentId
GET  /analytics/api/agent/:agentId/hourly
GET  /analytics/api/agent/:agentId/trend
GET  /analytics/api/campaign/:campaignId
GET  /analytics/api/campaign/:campaignId/trend
GET  /analytics/api/agents/compare
GET  /analytics/export/agents/csv
GET  /analytics/export/campaign/:campaignId/csv
```

---

### ✅ 5. Dashboard de Analytics (Frontend)

**Archivo de Vista:** `src/views/analyticsViews/dashboard.ejs`

**Características:**

#### Filtros de Fecha
- Selector de fecha inicio y fin
- Botón "Actualizar" para refrescar datos
- Botón "Resetear" para volver a fechas por defecto (último mes)

#### Sistema de Tabs
1. **Tab Agentes:**
   - Gráfico de barras comparativo (Chart.js)
   - Tabla detallada de métricas por agente
   - Botón de exportación a CSV
   - Badges de estado con colores

2. **Tab Campañas:**
   - Selector de campaña
   - Cards de resumen (Total Leads, Contactados, Exitosas, Conversión)
   - Gráfico de tendencia temporal (líneas)
   - Exportación a CSV por campaña

3. **Tab Análisis por Hora:**
   - Selector de agente
   - Selector de fecha específica
   - Gráfico de líneas de productividad horaria
   - Identifica horas pico de llamadas

#### Componentes UI
- Bootstrap 5 para layouts
- Font Awesome para iconos
- SweetAlert2 para notificaciones
- Chart.js 4.4.0 para gráficos

---

### ✅ 6. JavaScript del Dashboard

**Archivo:** `src/public/js/analytics-dashboard.js`

**Clase Principal:** `AnalyticsDashboard`

**Funcionalidades:**

#### Inicialización
```javascript
constructor() {
    this.charts = {};         // Almacena instancias de Chart.js
    this.currentData = {};    // Cache de datos actuales
    this.init();
}
```

#### Gestión de Gráficos

**1. Gráfico de Comparación de Agentes:**
- Tipo: Gráfico de barras (bar)
- Datasets: Llamadas Totales vs Ventas
- Auto-destruye y recrea al actualizar datos

**2. Gráfico de Tendencia de Campaña:**
- Tipo: Gráfico de líneas (line)
- Datasets: Llamadas Exitosas vs Fallidas
- Tensión de línea: 0.4 (suavizado)

**3. Gráfico de Productividad por Hora:**
- Tipo: Gráfico de líneas (line)
- Datasets: Llamadas Totales vs Contestadas
- Eje X: Horas del día (0:00 - 23:00)
- Eje Y: Cantidad de llamadas

#### Métodos Principales

**Carga de Datos:**
- `loadAgentsComparison()` - Carga y renderiza comparación de agentes
- `loadCampaignMetrics(campaignId)` - Carga métricas de campaña
- `loadHourlyMetrics(agentId)` - Carga análisis horario
- `loadCampaignSelector()` - Popula selector de campañas
- `loadAgentSelector()` - Popula selector de agentes

**Renderizado:**
- `renderAgentsChart(agents)` - Renderiza gráfico de agentes
- `renderAgentsTable(agents)` - Renderiza tabla de métricas
- `renderCampaignTrendChart(trendData)` - Renderiza tendencia de campaña
- `renderHourlyChart(hourlyData)` - Renderiza análisis horario

**Exportación:**
- `exportAgentsToCSV()` - Descarga CSV de agentes
- `exportCampaignToCSV()` - Descarga CSV de campaña

**Utilidades:**
- `getDateRange()` - Obtiene fechas seleccionadas
- `setDefaultDates()` - Establece último mes como default
- `getStatusBadge(status)` - Retorna HTML de badge de estado
- `formatDuration(seconds)` - Formatea duración MM:SS

---

### ✅ 7. Migración de Base de Datos

**Archivo:** `src/database/migrations/create-analytics-tables.js`

**Funcionalidad:**
- Crea tablas `agent_metrics` y `campaign_metrics`
- Ejecuta `sync({ force: false })` para no eliminar datos existentes
- Crea índices optimizados automáticamente

**Ejecución:**
```bash
node src/database/migrations/create-analytics-tables.js
```

**Resultado:**
```
✓ AgentMetric table created/verified
✓ CampaignMetric table created/verified
[Migration] Analytics tables created successfully!
```

---

### ✅ 8. Dependencias Instaladas

**Paquete:** `json2csv`

**Propósito:** Conversión de datos JSON a formato CSV

**Instalación:**
```bash
npm install json2csv
```

**Uso en Controlador:**
```javascript
import { Parser } from 'json2csv';

const parser = new Parser();
const csv = parser.parse(csvData);

res.setHeader('Content-Type', 'text/csv');
res.setHeader('Content-Disposition', 'attachment; filename="reporte.csv"');
res.send(csv);
```

---

## 🎯 Criterios de Éxito

- [x] Modelos de time-series creados y sincronizados
- [x] Servicio de analytics con 8 métodos funcionales
- [x] APIs REST completas para agentes y campañas
- [x] Dashboard con 3 tabs navegables
- [x] Gráficos interactivos con Chart.js
- [x] Exportación a CSV funcional
- [x] Análisis por hora implementado
- [x] Tendencias históricas disponibles
- [x] Comparación de agentes operativa

---

## 📊 Progreso

**Completado:** 100% ✅

```
[████████████████████] 100%
```

**Tareas Completadas:** 8/8
**Estado:** SPRINT COMPLETADO

---

## 🚀 Funcionalidades Implementadas

### APIs Completas

**Agentes:**
- ✅ Métricas en tiempo real por agente
- ✅ Comparación entre todos los agentes
- ✅ Análisis de productividad por hora
- ✅ Tendencias históricas
- ✅ Exportación a CSV

**Campañas:**
- ✅ Métricas en tiempo real por campaña
- ✅ Tendencias históricas
- ✅ Exportación a CSV

### Dashboard Interactivo

**Características:**
- ✅ Filtros de fecha con rango personalizable
- ✅ 3 tabs de navegación (Agentes, Campañas, Por Hora)
- ✅ Gráficos de barras y líneas interactivos
- ✅ Tablas responsivas con datos detallados
- ✅ Badges de estado con colores
- ✅ Cards de resumen de métricas
- ✅ Botones de exportación a CSV
- ✅ Notificaciones con SweetAlert2

---

## 📁 Archivos Modificados/Creados

**Modelos (2 nuevos):**
- `src/models/AgentMetric.js` (+90 líneas)
- `src/models/CampaignMetric.js` (+85 líneas)
- `src/models/index.js` (modificado, +5 líneas)

**Servicios (1 nuevo):**
- `src/services/analyticsService.js` (+480 líneas)

**Controladores (1 nuevo):**
- `src/controllers/analyticsController.js` (+360 líneas)

**Rutas (1 nuevo):**
- `src/routes/analyticsRoutes.js` (+30 líneas)
- `src/routes/index.js` (modificado, +2 líneas)

**Vistas (1 nuevo):**
- `src/views/analyticsViews/dashboard.ejs` (+265 líneas)

**JavaScript Frontend (1 nuevo):**
- `src/public/js/analytics-dashboard.js` (+570 líneas)

**Migraciones (1 nuevo):**
- `src/database/migrations/create-analytics-tables.js` (+25 líneas)

**Documentación (1 nuevo):**
- `SPRINT_3.3_RESUMEN.md` (este archivo)

**Total Líneas Agregadas:** ~1,917 líneas

---

## 📝 Notas Técnicas

### Performance

**Índices Optimizados:**
- Todas las consultas por `agente_id` y `campana_id` están indexadas
- Índices compuestos para queries con rango de fechas
- Búsquedas en tiempo real calculadas sin stored procedures

**Caching:**
- Dashboard mantiene cache de datos en memoria (this.currentData)
- Gráficos se destruyen y recrean al cambiar datos (evita memory leaks)

### Seguridad

**Autenticación:**
- Todas las rutas protegidas con `requireAuth` middleware
- Solo usuarios autenticados pueden acceder al dashboard
- CSV exportados solo incluyen datos del período seleccionado

**Validación:**
- Query params validados en controlador
- Respuestas con estructura consistente { success, data/message }
- Manejo de errores con try/catch en todas las APIs

### Escalabilidad

**Base de Datos:**
- Modelos listos para millones de registros (con índices)
- Snapshots pueden ejecutarse periódicamente (cron jobs)
- Queries optimizadas con joins y aggregations de Sequelize

**Frontend:**
- Chart.js con lazy loading de datos
- Solo carga datos del período seleccionado
- Gráficos responsivos que se adaptan al tamaño de pantalla

### Extensibilidad

**Nuevas Métricas:**
Para agregar nuevas métricas:
1. Agregar campo al modelo (AgentMetric o CampaignMetric)
2. Actualizar cálculo en `analyticsService`
3. Agregar columna a tabla del dashboard
4. Incluir en exportación CSV

**Nuevos Gráficos:**
Para agregar gráficos:
1. Agregar canvas en `dashboard.ejs`
2. Crear método `render[Nombre]Chart()` en `analytics-dashboard.js`
3. Configurar tipo de gráfico (bar, line, pie, etc.) de Chart.js

---

## 🔗 Referencias

**Servicios:**
- `analyticsService` - Lógica de cálculo de métricas

**Modelos:**
- `AgentMetric` - Snapshots de métricas de agentes
- `CampaignMetric` - Snapshots de métricas de campañas
- `User` - Agentes (relación con AgentMetric)
- `Campana` - Campañas (relación con CampaignMetric)
- `Call` - Registro de llamadas (fuente de datos)
- `WorkSession` - Sesiones de trabajo (fuente de datos)
- `BaseCampana` - Leads de campañas (fuente de datos)

**Librerías Externas:**
- Chart.js 4.4.0 (CDN) - Gráficos interactivos
- json2csv (npm) - Exportación a CSV
- Bootstrap 5 - UI framework
- SweetAlert2 - Notificaciones y confirmaciones

---

## 🎉 Próximos Pasos Sugeridos

### Sprint 3.4: Mejoras de Analytics (Opcional)

**Posibles Extensiones:**

1. **Integración con Metabase/Superset:**
   - Instalar Metabase como servicio Docker
   - Conectar a PostgreSQL
   - Crear dashboards predefinidos
   - Permitir custom queries a usuarios admin

2. **Reportes Programados:**
   - Cron jobs para enviar reportes por email
   - Generación automática de PDFs
   - Alertas cuando métricas bajan de umbrales

3. **Predicciones con ML:**
   - Predicción de conversión por lead
   - Forecasting de ventas mensuales
   - Análisis de sentiment en llamadas

4. **Analytics en Tiempo Real:**
   - WebSocket para actualización en vivo de métricas
   - Dashboard que se actualiza cada 10 segundos
   - Notificaciones push de eventos importantes

5. **Comparación de Períodos:**
   - Comparar mes actual vs mes anterior
   - Mostrar % de cambio en métricas
   - Gráficos de barras apiladas por período

---

**Última Actualización:** 25 de Octubre 2025
**Versión:** 1.0
**Sprint:** 3.3 - Reportes y Analytics Avanzados
