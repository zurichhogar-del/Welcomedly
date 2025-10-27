# Guía: Exponer Welcomedly para Testing Externo con Ngrok

**Para:** Dueño del Proyecto / Administrador
**Objetivo:** Permitir que testers externos accedan a tu servidor local sin desplegar

---

## ¿Qué es Ngrok?

Ngrok es una herramienta que **crea un túnel** desde internet hacia tu computadora local. Esto permite que cualquier persona con la URL pueda acceder a tu aplicación como si estuviera en internet, aunque realmente esté corriendo en tu localhost:3000.

**Ventajas:**
- ✅ Sin despliegue complejo
- ✅ Gratis (con limitaciones)
- ✅ Tu tester NO descarga nada
- ✅ Instalación en 2 minutos

**Limitaciones:**
- ⚠️ Tu computadora debe estar encendida mientras el tester prueba
- ⚠️ URL cambia cada vez que reinicias ngrok (versión gratis)
- ⚠️ No es para producción, solo testing

---

## Paso 1: Instalar Ngrok (Una Sola Vez)

### macOS:

```bash
# Opción A: Con Homebrew (recomendado)
brew install ngrok/ngrok/ngrok

# Opción B: Descarga manual
# 1. Ve a https://ngrok.com/download
# 2. Descarga la versión para macOS
# 3. Descomprime el archivo
# 4. Mueve ngrok a /usr/local/bin/
```

### Windows:

```powershell
# Opción A: Con Chocolatey
choco install ngrok

# Opción B: Descarga manual
# 1. Ve a https://ngrok.com/download
# 2. Descarga la versión para Windows
# 3. Descomprime el archivo .zip
# 4. Mueve ngrok.exe a C:\ngrok\
# 5. Agrega C:\ngrok\ al PATH
```

### Linux:

```bash
# Ubuntu/Debian
snap install ngrok

# O descarga manual
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar xvzf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin
```

### Verificar Instalación:

```bash
ngrok version
# Debería mostrar: ngrok version 3.x.x
```

---

## Paso 2: Registrarte en Ngrok (Gratis, Opcional pero Recomendado)

1. Ve a https://dashboard.ngrok.com/signup
2. Regístrate con email (o usa GitHub/Google)
3. Copia tu "Authtoken" desde el dashboard
4. Autentica ngrok en tu máquina:

```bash
ngrok config add-authtoken TU_TOKEN_AQUI
```

**¿Por qué registrarse?**
- ✅ Sesiones más largas
- ✅ Más conexiones simultáneas
- ✅ Subdominios personalizados (plan pago)

---

## Paso 3: Crear Usuarios de Prueba

**Una sola vez**, ejecuta el script para crear los usuarios:

```bash
# En la raíz del proyecto Welcomedly
npm run seed:test-users
```

**Salida esperada:**
```
🧪 SEED DE USUARIOS DE PRUEBA - WELCOMEDLY
✅ CREADO: admin.test (ADMIN)
✅ CREADO: agente.test1 (AGENTE)
✅ CREADO: agente.test2 (AGENTE)
🎉 ¡Usuarios de prueba creados exitosamente!
```

---

## Paso 4: Iniciar tu Servidor Local

Abre una terminal y ejecuta:

```bash
# En la raíz del proyecto
npm run dev
```

**Espera a ver:**
```
🚀 Servidor iniciado en http://localhost:3000
✅ Base de datos conectada correctamente
✅ Redis: Cliente listo y conectado
```

**⚠️ NO CIERRES ESTA TERMINAL mientras el tester esté probando**

---

## Paso 5: Exponer el Servidor con Ngrok

Abre **otra terminal** (deja la anterior corriendo) y ejecuta:

```bash
ngrok http 3000
```

**Verás algo como esto:**

```
ngrok

Session Status                online
Account                       tu.email@ejemplo.com (Plan: Free)
Version                       3.5.0
Region                        United States (us)
Latency                       45ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc-123-xyz.ngrok-free.app -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

---

## Paso 6: Copiar la URL de Ngrok

**La línea importante es:**
```
Forwarding    https://abc-123-xyz.ngrok-free.app -> http://localhost:3000
```

**Copia la URL:** `https://abc-123-xyz.ngrok-free.app`

⚠️ **IMPORTANTE:** Esta URL es **temporal** y cambiará cada vez que reinicies ngrok. Guárdala para dársela al tester.

---

## Paso 7: Compartir Acceso con el Tester

### Opción A: Editar CREDENCIALES_TESTING.md

1. Abre el archivo `CREDENCIALES_TESTING.md`
2. Reemplaza `[REEMPLAZAR-CON-TU-URL-NGROK]` con tu URL real:

```markdown
## URL de Acceso

https://abc-123-xyz.ngrok-free.app
```

3. Guarda el archivo
4. Comparte **CREDENCIALES_TESTING.md** con tu tester (email, WhatsApp, Slack, etc.)

### Opción B: Mensaje Directo

Envía este mensaje al tester:

```
Hola! Ya tengo Welcomedly listo para que pruebes.

📍 URL de acceso:
https://abc-123-xyz.ngrok-free.app

🔑 Credenciales:

ADMIN:
Usuario: admin.test
Contraseña: Test2025!

AGENTE:
Usuario: agente.test1
Contraseña: Test2025!

Cualquier duda, avísame!
```

---

## Paso 8: Monitoreo (Opcional)

Mientras el tester está probando, puedes ver el tráfico en tiempo real:

1. Abre en tu navegador: http://127.0.0.1:4040
2. Verás todas las peticiones HTTP que hace el tester
3. Útil para debugging si reporta problemas

---

## Paso 9: Cuando Termines el Testing

Para detener ngrok:

1. En la terminal de ngrok, presiona `Ctrl + C`
2. La URL dejará de funcionar
3. Tu servidor local (npm run dev) sigue corriendo
4. Si quieres detener el servidor también: `Ctrl + C` en esa terminal

---

## Troubleshooting (Solución de Problemas)

### Problema 1: "command not found: ngrok"

**Solución:**
- Verifica que ngrok esté instalado: `ngrok version`
- Si no está en PATH, usa la ruta completa: `/ruta/a/ngrok http 3000`

### Problema 2: "Failed to authenticate"

**Solución:**
- Registrate en https://dashboard.ngrok.com
- Copia tu authtoken
- Ejecuta: `ngrok config add-authtoken TU_TOKEN`

### Problema 3: El tester ve "ERR_NGROK_3200"

**Solución:**
- Este es un aviso de ngrok (versión gratis)
- El tester debe hacer click en "Visit Site"
- No es un error, es solo un warning

### Problema 4: "Tunnel not found"

**Solución:**
- Verifica que tu servidor local esté corriendo (npm run dev)
- Asegúrate de que esté en puerto 3000
- Reinicia ngrok: `ngrok http 3000`

### Problema 5: El tester no puede conectarse

**Solución:**
- Verifica que ambas terminales estén corriendo (servidor + ngrok)
- Copia la URL exacta de ngrok (incluye https://)
- Verifica que tu firewall no bloquee ngrok

---

## Flujo Completo (Resumen)

```bash
# Terminal 1: Servidor local
cd /ruta/a/Welcomedly
npm run dev
# ✅ Esperar a que inicie

# Terminal 2: Ngrok (EN OTRA TERMINAL)
ngrok http 3000
# ✅ Copiar URL que aparece (https://xxx.ngrok-free.app)

# Compartir con tester:
# 1. URL de ngrok
# 2. Usuario: admin.test / Test2025!
# 3. Usuario: agente.test1 / Test2025!
```

**Mientras el tester prueba:**
- ✅ Deja ambas terminales abiertas
- ✅ Tu computadora encendida
- ✅ No reinicies ngrok (o cambiará la URL)

**Cuando termine:**
- Ctrl + C en ambas terminales

---

## Comandos Útiles

```bash
# Iniciar ngrok en un puerto específico
ngrok http 3000

# Ver versión
ngrok version

# Ver configuración actual
ngrok config check

# Iniciar con autenticación básica (opcional)
ngrok http --basic-auth="usuario:password" 3000

# Iniciar con región específica
ngrok http --region=us 3000  # us, eu, ap, au, sa, jp, in
```

---

## Alternativas a Ngrok

Si ngrok no funciona, puedes usar:

1. **Localtunnel** (más simple, sin registro)
```bash
npm install -g localtunnel
lt --port 3000
```

2. **Serveo** (SSH tunnel, sin instalación)
```bash
ssh -R 80:localhost:3000 serveo.net
```

3. **Cloudflare Tunnel** (más robusto, gratis)
```bash
# Requiere instalación de cloudflared
cloudflared tunnel --url localhost:3000
```

---

## Mejores Prácticas

✅ **Hacer:**
- Probar la URL tú mismo antes de compartirla
- Revisar que los usuarios de prueba estén creados
- Monitorear el tráfico en http://127.0.0.1:4040
- Comunicar al tester si vas a reiniciar (cambiará la URL)

❌ **No hacer:**
- Usar ngrok para producción (solo testing)
- Compartir la URL públicamente (solo con tu tester)
- Cerrar las terminales mientras el tester prueba
- Exponer información sensible (usa usuarios de prueba)

---

## Próximos Pasos (Recomendados)

Una vez que el testing con ngrok esté funcionando, considera:

1. **Desplegar en Railway/Render** (GUIA_DEPLOY_RAILWAY.md)
   - URL permanente 24/7
   - No depende de tu computadora
   - Más profesional

2. **Setup local para el tester** (SETUP_PARA_TESTERS.md)
   - Si el tester tiene conocimientos técnicos
   - Ambiente independiente
   - Sin depender de tu computadora

---

## Contacto y Soporte

**Ngrok Docs:** https://ngrok.com/docs
**Ngrok Dashboard:** https://dashboard.ngrok.com
**Status Page:** https://status.ngrok.com

---

**Última actualización:** Octubre 2025
**Versión del documento:** 1.0
