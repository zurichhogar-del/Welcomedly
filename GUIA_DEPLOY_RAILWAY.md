# Guía: Desplegar Welcomedly en Railway (Gratis)

**Para:** Dueño del Proyecto
**Objetivo:** Tener una URL permanente 24/7 para que testers accedan sin depender de tu computadora
**Tiempo estimado:** 20-30 minutos

---

## ¿Por qué Railway?

**Ventajas:**
- ✅ $5 crédito gratis al mes (suficiente para testing)
- ✅ URL permanente (no cambia como ngrok)
- ✅ PostgreSQL y Redis incluidos
- ✅ Despliegue automático desde GitHub
- ✅ SSL/HTTPS gratis
- ✅ Logs en tiempo real

**Railway vs Ngrok:**

| Característica | Railway | Ngrok |
|----------------|---------|-------|
| Tu PC encendida | ❌ NO | ✅ SÍ |
| URL permanente | ✅ SÍ | ❌ NO |
| Gratis | ✅ SÍ ($5/mes) | ✅ SÍ (limitado) |
| Setup | 20 min | 2 min |

---

## Requisitos Previos

1. ✅ Cuenta de GitHub (donde está tu repositorio)
2. ✅ Cuenta de Railway (crear en paso 1)
3. ✅ Código subido a GitHub

---

## Paso 1: Crear Cuenta en Railway

1. Ve a https://railway.app
2. Click en "Start a New Project"
3. Autentícate con GitHub (recomendado)
4. Te dan **$5 gratis al mes**

---

## Paso 2: Preparar el Repositorio

### 2.1 Crear archivo `railway.json` (Configuración)

En la raíz de tu proyecto, crea:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run dev",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 300
  }
}
```

### 2.2 Actualizar `.gitignore`

Verifica que estos archivos NO estén en Git:

```
.env
.env.local
.env.production
node_modules/
logs/
*.log
```

### 2.3 Hacer commit y push

```bash
git add railway.json
git commit -m "Add Railway configuration"
git push origin main
```

---

## Paso 3: Crear Proyecto en Railway

1. En Railway dashboard, click "New Project"
2. Selecciona "Deploy from GitHub repo"
3. Autoriza acceso a tus repositorios
4. Selecciona el repositorio `Welcomedly`
5. Railway detectará automáticamente que es Node.js

---

## Paso 4: Agregar Base de Datos PostgreSQL

1. En tu proyecto Railway, click "+ New"
2. Selecciona "Database" → "PostgreSQL"
3. Railway creará la base de datos automáticamente
4. Espera a que el estado sea "Running"

**Railway auto-configura:**
- `DATABASE_URL` (URL completa de conexión)
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

---

## Paso 5: Agregar Redis

1. Click "+ New" nuevamente
2. Selecciona "Database" → "Redis"
3. Espera a que esté "Running"

**Railway auto-configura:**
- `REDIS_URL` (URL completa de conexión)
- `REDIS_HOST`, `REDIS_PORT`

---

## Paso 6: Configurar Variables de Entorno

En la pestaña "Variables" de tu servicio Node.js, agrega:

```bash
# NODE
NODE_ENV=production
PORT=3000

# SESSION
SESSION_SECRET=TU_SECRET_ALEATORIO_AQUI_32_CARACTERES

# CORS (usa tu URL de Railway)
CORS_ORIGIN=https://welcomedly-production.up.railway.app

# OpenAI (opcional)
OPENAI_API_KEY=tu_api_key_aqui
OPENAI_MODEL=gpt-3.5-turbo

# Asterisk (opcional - dejar vacío si no usas telefonía)
ASTERISK_HOST=
ASTERISK_PORT=
ASTERISK_USER=
ASTERISK_PASSWORD=
```

**⚠️ IMPORTANTE:**
- Railway auto-conecta PostgreSQL y Redis (no necesitas configurar DB_HOST, etc.)
- Genera un SESSION_SECRET seguro:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```

---

## Paso 7: Conectar Servicios

Railway necesita saber que tu app Node.js usa PostgreSQL y Redis:

1. Selecciona tu servicio Node.js
2. Ve a "Settings" → "Service Variables"
3. Verifica que aparezcan:
   - `DATABASE_URL` (de PostgreSQL)
   - `REDIS_URL` (de Redis)

Si no aparecen automáticamente:

1. Click en "Service Variables"
2. "+ Reference" → Selecciona PostgreSQL → `DATABASE_URL`
3. "+ Reference" → Selecciona Redis → `REDIS_URL`

---

## Paso 8: Ajustar Código para Railway

### 8.1 Actualizar conexión a PostgreSQL

En `src/database/database.js` o donde configures Sequelize:

```javascript
// Detectar si estamos en Railway (tienen DATABASE_URL)
const databaseUrl = process.env.DATABASE_URL;

const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, {
      dialect: 'postgres',
      protocol: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false // Railway usa SSL
        }
      },
      logging: process.env.NODE_ENV === 'development' ? console.log : false
    })
  : new Sequelize({
      // Tu configuración local actual
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      // ... resto de config
    });
```

### 8.2 Actualizar conexión a Redis

En tu configuración de Redis:

```javascript
import redis from 'redis';

const redisUrl = process.env.REDIS_URL;

const redisClient = redisUrl
  ? redis.createClient({
      url: redisUrl,
      socket: {
        tls: true,
        rejectUnauthorized: false
      }
    })
  : redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379
    });
```

### 8.3 Hacer commit

```bash
git add .
git commit -m "Configure for Railway deployment"
git push origin main
```

**Railway auto-desplegará cuando detecte el push.**

---

## Paso 9: Ejecutar Migraciones (Primera vez)

Una vez desplegado, necesitas inicializar la base de datos:

### Opción A: Desde Railway CLI (Recomendado)

1. Instalar Railway CLI:
```bash
# macOS/Linux
brew install railway

# Windows (con Scoop)
scoop install railway

# O descarga manual desde https://docs.railway.app/develop/cli
```

2. Autenticar:
```bash
railway login
```

3. Conectar al proyecto:
```bash
railway link
# Selecciona tu proyecto Welcomedly
```

4. Ejecutar seed de usuarios:
```bash
railway run npm run seed:test-users
```

### Opción B: Crear script de inicialización

Crea `scripts/init-database.sh`:

```bash
#!/bin/bash
echo "Inicializando base de datos..."
node src/database/seedTestUsers.js
node src/database/seedDisposiciones.js
echo "✅ Base de datos inicializada"
```

Hazlo ejecutable:
```bash
chmod +x scripts/init-database.sh
```

Ejecuta desde Railway CLI:
```bash
railway run ./scripts/init-database.sh
```

---

## Paso 10: Verificar Despliegue

1. Railway te dará una URL como:
   ```
   https://welcomedly-production.up.railway.app
   ```

2. Abre la URL en tu navegador
3. Deberías ver la landing page de Welcomedly

### Testing:

```bash
# Health check
curl https://tu-url.railway.app/health

# Login
# Abre en navegador: https://tu-url.railway.app/auth/login
# Usuario: admin.test
# Contraseña: Test2025!
```

---

## Paso 11: Compartir con el Tester

Actualiza `CREDENCIALES_TESTING.md` con la URL permanente:

```markdown
## URL de Acceso

https://welcomedly-production.up.railway.app

(Esta URL es permanente y funciona 24/7)
```

Comparte el documento con tu tester.

---

## Monitoreo y Logs

### Ver logs en tiempo real:

**Opción A: Dashboard Web**
1. Ve a Railway dashboard
2. Selecciona tu servicio
3. Click en "Deployments"
4. Click en el deployment activo
5. Ver logs en tiempo real

**Opción B: Railway CLI**
```bash
railway logs
```

### Métricas:

Railway muestra automáticamente:
- CPU usage
- Memory usage
- Network I/O
- Request count

---

## Solución de Problemas

### Problema 1: Build falla

**Error común:**
```
npm ERR! missing script: start
```

**Solución:**
En `package.json`, verifica que tengas:
```json
"scripts": {
  "dev": "nodemon src/index.js",
  "start": "node src/index.js"  // ← Agregar esto
}
```

### Problema 2: App crashea al iniciar

**Check logs:**
```bash
railway logs
```

**Causas comunes:**
- Puerto incorrecto (Railway usa variable `PORT`)
- Falta variables de entorno
- Base de datos no inicializada

**Solución para puerto:**
```javascript
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {  // '0.0.0.0' importante en Railway
  console.log(`Servidor en puerto ${PORT}`);
});
```

### Problema 3: No conecta a base de datos

**Verificar:**
1. Railway → Services → PostgreSQL → Status = "Running"
2. Railway → Node.js Service → Variables → `DATABASE_URL` existe
3. Código usa `DATABASE_URL` en producción (ver Paso 8.1)

### Problema 4: "Application Error"

**Check:**
```bash
railway logs --tail 100
```

Busca líneas con `[error]` o `Error:`

### Problema 5: Excediste crédito gratuito

Railway te da $5/mes gratis. Si lo excedes:

**Opciones:**
1. Agregar tarjeta de crédito (solo cobran lo que uses sobre $5)
2. Migrar a otro servicio (Render, Fly.io)
3. Optimizar uso (reducir recursos, escalar a cero cuando no se usa)

---

## Costos Estimados

Con el **plan gratuito de $5/mes**, puedes correr:

| Recurso | Uso Estimado | Costo/mes |
|---------|--------------|-----------|
| Node.js App (512MB RAM) | 24/7 | ~$3 |
| PostgreSQL (pequeño) | 24/7 | ~$1 |
| Redis (pequeño) | 24/7 | ~$0.50 |
| **TOTAL** | | **~$4.50** |

✅ Cabe perfecto en los $5 gratis

---

## Despliegue Automático (CI/CD)

Railway despliega automáticamente cuando:
- Haces `git push` a la rama main
- Railway detecta cambios
- Rebuilds y redeploys automáticamente

Para desactivar auto-deploy:
1. Settings → "Deployment Trigger"
2. Cambiar de "main" a "Manual"

---

## Dominios Personalizados (Opcional)

Si tienes un dominio (ej: `welcomedly.com`):

1. Ve a tu servicio → "Settings" → "Domains"
2. Click "+ Custom Domain"
3. Ingresa tu dominio: `app.welcomedly.com`
4. Railway te dará registros DNS para configurar
5. Agrega los registros en tu proveedor de DNS
6. Espera propagación (5-30 min)

**Ventaja:** URL profesional en lugar de `*.railway.app`

---

## Alternativas a Railway

Si Railway no funciona para ti:

### 1. Render (Similar a Railway)
- También gratis
- https://render.com
- Setup muy similar

### 2. Fly.io (Más técnico)
- Más configuración
- Mejor para tráfico alto
- https://fly.io

### 3. Heroku (Clásico)
- Ya no tiene tier gratuito ($5-7/mes mínimo)
- https://heroku.com

---

## Mejores Prácticas

✅ **Hacer:**
- Usar variables de entorno para todo
- Monitorear logs regularmente
- Tener backup de base de datos
- Usar ramas separadas (main = production, dev = testing)

❌ **No hacer:**
- Commitear archivos .env
- Usar credenciales reales en testing
- Ignorar errores en logs
- Exponer información sensible

---

## Próximos Pasos

Una vez que Railway esté funcionando:

1. **Configurar backups** de base de datos
2. **Monitoreo** con herramientas como Sentry o LogRocket
3. **CI/CD avanzado** con GitHub Actions
4. **Staging environment** (ambiente de pruebas separado)

---

## Recursos Útiles

- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **Railway Status:** https://status.railway.app
- **Pricing:** https://railway.app/pricing

---

## Contacto

**Railway Support:** help@railway.app
**Community Discord:** https://discord.gg/railway

---

**Última actualización:** Octubre 2025
**Versión del documento:** 1.0
