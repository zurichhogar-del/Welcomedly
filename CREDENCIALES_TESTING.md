# Credenciales de Acceso - Welcomedly Testing

**Fecha de emisión:** Octubre 2025
**Versión del sistema:** 2.2.0
**Ambiente:** Testing/QA

---

## URL de Acceso

```
https://inexpediently-macronucleate-ameer.ngrok-free.dev
```

> **Nota:** Esta URL es temporal y cambiará cada vez que el servidor se reinicie. Si la URL no funciona, contacta al administrador para obtener la URL actualizada.

---

## Usuarios de Prueba

### ADMINISTRADOR

**Rol:** Supervisor/Admin
**Usuario:** `admin.test`
**🔑 LOGIN CON:** `admin.test@welcomedly.com` ⚠️ (usar el CORREO, no el usuario)
**Contraseña:** `Test2025!`

**Permisos:**
- ✅ Crear y gestionar campañas
- ✅ Crear y gestionar formularios
- ✅ Ver reportes y analíticas
- ✅ Gestionar agentes
- ✅ Asignar agentes a campañas
- ✅ Ver dashboard de supervisor

---

### AGENTE 1

**Rol:** Agente de Call Center
**Usuario:** `agente.test1`
**🔑 LOGIN CON:** `agente.test1@welcomedly.com` ⚠️ (usar el CORREO, no el usuario)
**Contraseña:** `Test2025!`

**Permisos:**
- ✅ Acceder a campañas asignadas
- ✅ Realizar gestión de llamadas
- ✅ Aplicar tipificaciones
- ✅ Ver base de datos de campaña
- ✅ Registrar disposiciones
- ❌ No puede crear campañas
- ❌ No puede ver dashboard de supervisor

---

### AGENTE 2

**Rol:** Agente de Call Center
**Usuario:** `agente.test2`
**🔑 LOGIN CON:** `agente.test2@welcomedly.com` ⚠️ (usar el CORREO, no el usuario)
**Contraseña:** `Test2025!`

**Permisos:**
- ✅ Acceder a campañas asignadas
- ✅ Realizar gestión de llamadas
- ✅ Aplicar tipificaciones
- ✅ Ver base de datos de campaña
- ✅ Registrar disposiciones
- ❌ No puede crear campañas
- ❌ No puede ver dashboard de supervisor

---

## Flujo de Testing Recomendado

### Paso 1: Login como ADMIN

1. Ingresa a la URL proporcionada
2. Login con `admin.test@welcomedly.com` / `Test2025!` ⚠️ (usar CORREO, no username)
3. Deberías ver el dashboard de supervisor

### Paso 2: Crear una Campaña (Como ADMIN)

1. Ve a "Market" → "Crear Campaña"
2. Completa:
   - Nombre de campaña (ej: "Prueba Testing 2025")
   - Guión de llamada (texto libre)
3. Asignar agentes: Selecciona `agente.test1` y `agente.test2`
4. Subir base de datos CSV o agregar registros manualmente
5. Guardar campaña

### Paso 3: Crear un Formulario (Como ADMIN)

1. Ve a "Market" → "Formularios"
2. Crear nuevo formulario
3. Agregar opciones de tipificación:
   - Venta cerrada
   - Interesado
   - No interesado
   - Volver a llamar
   - No contesta
4. Guardar formulario

### Paso 4: Asignar Formulario a Campaña

1. Editar la campaña creada
2. Asignar el formulario creado
3. Guardar cambios

### Paso 5: Probar como AGENTE

1. Cerrar sesión del ADMIN
2. Login con `agente.test1@welcomedly.com` / `Test2025!` ⚠️ (usar CORREO)
3. Deberías ver la campaña asignada
4. Click en "Iniciar Gestión"
5. Probar llamada y tipificación

---

## Funcionalidades a Probar

### Como ADMIN:

- [ ] Login/Logout
- [ ] Dashboard de supervisor
- [ ] Crear campañas
- [ ] Crear formularios
- [ ] Ver lista de agentes
- [ ] Crear nuevo agente
- [ ] Asignar agentes a campañas
- [ ] Subir base de datos (CSV)
- [ ] Ver reportes
- [ ] Editar campañas existentes
- [ ] Eliminar campañas
- [ ] Activar/desactivar agentes

### Como AGENTE:

- [ ] Login/Logout
- [ ] Ver campañas asignadas
- [ ] Iniciar gestión de campaña
- [ ] Ver registros de la base de datos
- [ ] Seleccionar registro para llamar
- [ ] Aplicar tipificación
- [ ] Guardar observaciones
- [ ] Ver historial de gestiones
- [ ] Buscar registros específicos
- [ ] Filtrar registros por estado

---

## Disposiciones Disponibles (Tipificaciones)

Las siguientes disposiciones deberían estar disponibles:

1. **Venta Cerrada** - Contacto exitoso con venta
2. **Interesado** - Cliente muestra interés, seguimiento posterior
3. **No Interesado** - Cliente rechaza oferta
4. **Volver a Llamar** - Agendamiento de callback
5. **No Contesta** - Llamada sin respuesta
6. **Número Equivocado** - Contacto incorrecto
7. **Buzón de Voz** - Llamada redirigida a buzón
8. **Ocupado** - Línea ocupada

---

## Reportar Problemas (Bugs)

Al encontrar un problema, reporta lo siguiente:

### Información Requerida:

1. **Usuario utilizado:** (admin.test, agente.test1, etc.)
2. **Pantalla/Sección:** (ej: "Crear Campaña", "Dashboard", etc.)
3. **Pasos para reproducir:**
   - Paso 1: ...
   - Paso 2: ...
   - Paso 3: ...
4. **Resultado esperado:** Qué debería pasar
5. **Resultado actual:** Qué pasó realmente
6. **Capturas de pantalla:** (si es posible)
7. **Mensajes de error:** Copiar cualquier mensaje de error

### Ejemplo de Reporte:

```
Usuario: agente.test1
Pantalla: Gestión de Campaña
Pasos:
1. Login como agente.test1
2. Click en campaña "Test 2025"
3. Click en "Iniciar Gestión"
4. Selecciono primer registro
5. Click en "Guardar tipificación" sin seleccionar disposición

Esperado: Mensaje de error indicando que debo seleccionar una disposición
Actual: La página se queda en blanco
Error en consola: "TypeError: Cannot read property 'id' of undefined"
```

---

## Datos de Ejemplo (Si Aplica)

Si el administrador ejecutó el seed de datos completo, deberías ver:

- **5 registros de prueba** en la campaña de testing
- **Formulario de ventas** pre-configurado
- **Disposiciones básicas** ya creadas

### Contactos de Prueba:

| Nombre | Teléfono | Empresa |
|--------|----------|---------|
| Juan Pérez | 3001234567 | Tech Solutions |
| María González | 3009876543 | Marketing Plus |
| Carlos Rodríguez | 3005551234 | Innovate SA |

---

## Contacto y Soporte

**Administrador del Proyecto:** [TU NOMBRE]
**Email:** [TU EMAIL]
**Disponibilidad:** [TUS HORARIOS]

**Tiempo de respuesta estimado:** 24-48 horas

---

## Notas Importantes

⚠️ **Este es un ambiente de pruebas:**
- Los datos NO son reales
- Las modificaciones NO afectan producción
- Puedes crear/editar/eliminar libremente
- Los datos pueden ser reseteados en cualquier momento

✅ **Recordatorios:**
- Guarda esta contraseña en un lugar seguro
- No compartas estas credenciales públicamente
- Si olvidas la contraseña, contacta al administrador
- La URL cambiará si el servidor se reinicia (ngrok gratuito)

---

**Última actualización:** Octubre 2025
**Versión del documento:** 1.0
