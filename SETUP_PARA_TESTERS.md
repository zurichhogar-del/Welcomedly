# Setup Local - Welcomedly para Testers

**Para:** Colaboradores/Testers con conocimientos técnicos
**Objetivo:** Configurar ambiente de desarrollo local para testing
**Tiempo estimado:** 15-20 minutos
**Nivel:** Semi-técnico / Técnico

---

## Requisitos del Sistema

Antes de empezar, necesitas tener instalado:

### Software Obligatorio:

1. **Node.js** (v18 o superior)
   - Descarga: https://nodejs.org
   - Verificar: `node --version`

2. **Git**
   - Descarga: https://git-scm.com
   - Verificar: `git --version`

3. **PostgreSQL** (v14 o superior)
   - macOS: https://postgresapp.com
   - Windows: https://www.postgresql.org/download/windows
   - Linux: `sudo apt install postgresql`
   - Verificar: `psql --version`

4. **Redis** (v6 o superior)
   - macOS: `brew install redis`
   - Windows: https://github.com/microsoftarchive/redis/releases
   - Linux: `sudo apt install redis-server`
   - Verificar: `redis-cli --version`

---

## Paso 1: Clonar el Repositorio

```bash
# Clona el repositorio
git clone https://github.com/TU-USUARIO/Welcomedly.git

# Entra al directorio
cd Welcomedly

# Verificar que estás en la rama correcta
git branch
# Debería mostrar: * main
```

---

## Paso 2: Instalar Dependencias

```bash
# Instalar todas las dependencias de Node.js
npm install

# Esto puede tardar 2-3 minutos
# Debería terminar sin errores
```

**Salida esperada:**
```
added 542 packages, and audited 543 packages in 2m
```

---

## Paso 3: Configurar Variables de Entorno

### 3.1 Copiar archivo de ejemplo

```bash
cp .env.example .env
```

### 3.2 Editar archivo .env

Abre el archivo `.env` con tu editor favorito y configura:

```bash
# Base de datos PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=welcomedly_test
DB_USER=postgres
DB_PASSWORD=tu_password_postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Servidor
PORT=3000
NODE_ENV=development

# Seguridad - Genera uno aleatorio
SESSION_SECRET=TU_SECRET_ALEATORIO_32_CARACTERES_AQUI

# OpenAI (Opcional - dejar vacío si no tienes API key)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-3.5-turbo

# Asterisk (Opcional - dejar vacío)
ASTERISK_HOST=
ASTERISK_PORT=
ASTERISK_USER=
ASTERISK_PASSWORD=
```

**Para generar SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Paso 4: Crear Base de Datos

### Opción A: Desde terminal

```bash
# Conectar a PostgreSQL
psql -U postgres

# Crear base de datos
CREATE DATABASE welcomedly_test;

# Salir
\q
```

### Opción B: Con GUI (pgAdmin, TablePlus, DBeaver)

1. Abre tu cliente de PostgreSQL
2. Conecta a localhost:5432
3. Usuario: postgres
4. Crear nueva base de datos: `welcomedly_test`

---

## Paso 5: Iniciar Redis

### macOS/Linux:

```bash
# Iniciar Redis en background
redis-server --daemonize yes

# Verificar que está corriendo
redis-cli ping
# Debería responder: PONG
```

### Windows:

```powershell
# Iniciar Redis (en ventana separada)
redis-server

# En otra terminal, verificar:
redis-cli ping
# Debería responder: PONG
```

---

## Paso 6: Ejecutar Migraciones (Crear Tablas)

```bash
# El proyecto tiene migraciones automáticas
# Al iniciar por primera vez, Sequelize crea las tablas
npm run dev
```

**Espera a ver:**
```
🚀 Servidor iniciado en http://localhost:3000
✅ Base de datos conectada correctamente
✅ Redis: Cliente listo y conectado
```

Si ves eso, **detén el servidor** (Ctrl + C) y continúa con el siguiente paso.

---

## Paso 7: Seed de Datos de Prueba (Usuarios + Datos)

```bash
# Opción A: Solo usuarios (Rápido - 5 segundos)
npm run seed:test-users

# Opción B: Setup completo con datos de ejemplo (Completo - 10 segundos)
npm run setup:testing
```

**Con Opción B obtienes:**
- 3 usuarios (1 admin + 2 agentes)
- 1 formulario de ejemplo
- 1 campaña de ejemplo
- 5 contactos de ejemplo
- Disposiciones básicas

**Salida esperada:**
```
🧪 SEED DE USUARIOS DE PRUEBA
✅ CREADO: admin.test (ADMIN)
✅ CREADO: agente.test1 (AGENTE)
✅ CREADO: agente.test2 (AGENTE)
🎉 ¡Usuarios de prueba creados exitosamente!
```

---

## Paso 8: Iniciar el Servidor

```bash
npm run dev
```

**Deberías ver:**
```
[nodemon] starting `node src/index.js`
Winston Logger initialized
Trust proxy habilitado: loopback
Redis: Cliente listo y conectado
✅ Base de datos conectada correctamente
🚀 Servidor iniciado en http://localhost:3000
```

---

## Paso 9: Acceder a la Aplicación

Abre tu navegador en: http://localhost:3000

### Login:

**Como ADMIN:**
- Usuario: `admin.test`
- Contraseña: `Test2025!`

**Como AGENTE:**
- Usuario: `agente.test1`
- Contraseña: `Test2025!`

---

## Estructura del Proyecto

```
Welcomedly/
├── src/
│   ├── index.js              # Punto de entrada
│   ├── models/               # Modelos de base de datos
│   ├── routes/               # Rutas/Endpoints
│   ├── controllers/          # Lógica de negocio
│   ├── services/             # Servicios (Redis, etc.)
│   ├── middlewares/          # Middleware (auth, security)
│   ├── database/             # Configuración DB
│   ├── views/                # Templates EJS
│   └── public/               # Assets (CSS, JS, imgs)
├── .env                      # Variables de entorno (TÚ LO CREAS)
├── .env.example              # Template de .env
├── package.json              # Dependencias
└── README.md                 # Documentación principal
```

---

## Solución de Problemas

### Problema 1: "Cannot find module"

```
Error: Cannot find module 'express'
```

**Solución:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Problema 2: No conecta a PostgreSQL

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solución:**
```bash
# Verificar que PostgreSQL esté corriendo
pg_isready

# Si no está corriendo, iniciar:
# macOS: brew services start postgresql
# Linux: sudo service postgresql start
# Windows: Iniciar desde Services
```

### Problema 3: No conecta a Redis

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solución:**
```bash
# Verificar que Redis esté corriendo
redis-cli ping

# Si no responde, iniciar:
redis-server --daemonize yes
```

### Problema 4: Puerto 3000 ocupado

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solución:**
```bash
# Encontrar proceso usando puerto 3000
lsof -ti:3000

# Matar proceso
kill -9 $(lsof -ti:3000)

# O cambiar puerto en .env
PORT=3001
```

### Problema 5: Error de permisos en PostgreSQL

```
FATAL: password authentication failed for user "postgres"
```

**Solución:**
1. Verifica usuario y contraseña en `.env`
2. Resetea contraseña de postgres si es necesario
3. O usa otro usuario con permisos

---

## Comandos Útiles

```bash
# Desarrollo
npm run dev                    # Iniciar servidor con hot-reload

# Testing
npm test                       # Correr tests
npm run test:coverage          # Tests con coverage

# Linting
npm run lint                   # Verificar código
npm run lint:fix               # Arreglar problemas automáticamente

# Formateo
npm run format                 # Formatear código con Prettier

# CSS
npm run build:css              # Compilar Tailwind CSS
npm run watch:css              # Compilar CSS en modo watch

# Base de datos
npm run seed:test-users        # Crear usuarios de prueba
npm run setup:testing          # Setup completo (usuarios + datos)

# Logs
tail -f logs/combined.log      # Ver logs en tiempo real
```

---

## Workflow de Testing

### 1. Cada vez que empiezas a trabajar:

```bash
# Terminal 1: Redis
redis-server --daemonize yes

# Terminal 2: Servidor
cd Welcomedly
npm run dev

# Navegador
# http://localhost:3000
```

### 2. Para probar cambios:

1. Edita archivos en `src/`
2. Guarda
3. Nodemon reiniciará automáticamente
4. Refresca navegador

### 3. Antes de reportar bugs:

```bash
# Ver logs detallados
tail -f logs/combined.log

# O ver errores específicos
tail -f logs/error.log
```

### 4. Al terminar el día:

```bash
# Detener servidor
Ctrl + C

# (Opcional) Detener Redis
redis-cli shutdown
```

---

## Guía Rápida de Git

### Mantener código actualizado:

```bash
# Ver estado
git status

# Obtener últimos cambios
git pull origin main

# Si hay conflictos, el admin te ayudará
```

### Reportar bugs (con código):

```bash
# Crear nueva rama para tu fix
git checkout -b fix/descripcion-bug

# Hacer cambios...

# Commit
git add .
git commit -m "Fix: descripción del bug"

# Subir
git push origin fix/descripcion-bug

# Crear Pull Request en GitHub
```

---

## Recursos de Ayuda

### Documentación del Proyecto:

- **README.md** - Visión general
- **CREDENCIALES_TESTING.md** - Usuarios y flujos de prueba
- **ARQUITECTURA_SISTEMA.md** - Arquitectura técnica

### Docs de Tecnologías:

- **Express.js:** https://expressjs.com
- **Sequelize:** https://sequelize.org
- **Socket.IO:** https://socket.io
- **Redis:** https://redis.io
- **EJS:** https://ejs.co

### Ayuda:

- Contactar al administrador del proyecto
- Revisar issues en GitHub
- Preguntar en el canal de Slack/Discord del equipo

---

## Mejores Prácticas

✅ **Hacer:**
- Hacer `git pull` antes de empezar cada día
- Probar antes de reportar bugs
- Incluir logs/screenshots en reportes
- Usar ramas separadas para fixes/features

❌ **No hacer:**
- Commitear archivos .env
- Modificar package.json sin avisar
- Trabajar directamente en rama main
- Pushear código que no compila

---

## Siguiente Paso

Una vez que tu ambiente esté funcionando:

1. Lee **CREDENCIALES_TESTING.md** para conocer los flujos a probar
2. Prueba login con los 3 usuarios
3. Crea una campaña de prueba como ADMIN
4. Prueba gestión de llamadas como AGENTE
5. Reporta cualquier bug que encuentres

---

**¿Necesitas ayuda?**

- Email: [ADMIN_EMAIL]
- Slack/Discord: [CANAL]
- GitHub Issues: [REPO_URL]/issues

---

**Última actualización:** Octubre 2025
**Versión del documento:** 1.0
