# Documentación Deprecada

Esta carpeta contiene documentación obsoleta que se mantiene únicamente por referencia histórica.

**⚠️ ADVERTENCIA:** Los documentos en esta carpeta están desactualizados y no reflejan el estado actual del sistema.

---

## Por Qué Están Deprecados

| Documento | Fecha Deprecación | Motivo | Reemplazo |
|-----------|-------------------|--------|-----------|
| **ARCHITECTURE.md** | 26 Oct 2025 | Información desactualizada, no incluye clustering ni replication | [ARQUITECTURA_SISTEMA.md](../02-architecture/ARQUITECTURA_SISTEMA.md) |
| **RESUMEN_PROYECTO.md** | 26 Oct 2025 | Resumen antiguo, no incluye Fase 4 completa | [RESUMEN_EJECUTIVO_FINAL.md](../01-overview/RESUMEN_EJECUTIVO_FINAL.md) |
| **IMPLEMENTATION_SUMMARY.md** | 26 Oct 2025 | Resumen parcial, información dispersa en otros docs | Información integrada en docs actuales |
| **PLAN_COMPLETO_DESARROLLO.md** | 26 Oct 2025 | Plan original ya completado al 100% | [RESUMEN_EJECUTIVO_FINAL.md](../01-overview/RESUMEN_EJECUTIVO_FINAL.md) |
| **PROPOSICION_STACK_TECNOLOGICO.md** | 26 Oct 2025 | Propuesta original, stack ya definido e implementado | [tech_stack_document.md](../02-architecture/tech_stack_document.md) |
| **instructions.md** | 26 Oct 2025 | Instrucciones obsoletas del inicio del proyecto | [CLAUDE.md](../03-development/CLAUDE.md) |
| **AGENTS.md** | 26 Oct 2025 | Funcionalidad de agents cambiada completamente | [CLAUDE.md](../03-development/CLAUDE.md) |
| **COMPONENTS_GUIDE.md** | 26 Oct 2025 | Guía de componentes antigua | Integrado en [frontend_guidelines_document.md](../03-development/frontend_guidelines_document.md) |
| **ASTERISK_WEBRTC_ARCHITECTURE.md** | 26 Oct 2025 | Funcionalidad de telefonía no implementada en esta versión | N/A (Roadmap futuro) |
| **TELEPHONY_SYSTEM_DOCUMENTATION.md** | 26 Oct 2025 | Sistema de telefonía no implementado | N/A (Roadmap futuro) |
| **TRUNK_MANAGEMENT_GUIDE.md** | 26 Oct 2025 | Gestión de trunks no implementada | N/A (Roadmap futuro) |

---

## ¿Debería Leer Estos Documentos?

**Respuesta corta:** ❌ NO

**Respuesta larga:** Estos documentos se mantienen solo por:
1. **Referencia histórica:** Ver cómo era el sistema antes
2. **Contexto de decisiones:** Entender por qué se tomaron ciertas decisiones
3. **Auditoría:** Trazabilidad del proyecto

**Si buscas información actual del sistema, ve a:**
- [Documentación Principal](../README.md)
- [Resumen Ejecutivo](../01-overview/RESUMEN_EJECUTIVO_FINAL.md)
- [Arquitectura Actual](../02-architecture/ARQUITECTURA_SISTEMA.md)

---

## Análisis Detallado de Deprecación

### ARCHITECTURE.md
**Problemas:**
- No menciona clustering (Fase 4.1)
- No menciona PostgreSQL replication (Fase 4.2)
- No incluye Redis adapter para Socket.IO
- Arquitectura single-instance obsoleta

**Estado actual:** Sistema enterprise con 3 instancias + load balancer + replication

---

### RESUMEN_PROYECTO.md
**Problemas:**
- Solo documenta hasta Sprint 3.2.5
- No incluye Sprint 3.3 (Analytics)
- No incluye Fase 4 (Enterprise)
- Métricas desactualizadas

**Estado actual:** Proyecto 100% completo con todas las fases

---

### IMPLEMENTATION_SUMMARY.md
**Problemas:**
- Resumen muy alto nivel
- Información dispersa
- No incluye detalles de implementación actuales

**Reemplazo:** Información consolidada en RESUMEN_EJECUTIVO_FINAL.md

---

### PLAN_COMPLETO_DESARROLLO.md
**Problemas:**
- Plan original del proyecto
- 100% ya implementado
- Roadmap cumplido

**Estado:** Plan completado exitosamente

---

### PROPOSICION_STACK_TECNOLOGICO.md
**Problemas:**
- Propuesta inicial de tecnologías
- Stack ya definido y en producción
- Algunas tecnologías propuestas no se usaron

**Reemplazo:** tech_stack_document.md tiene el stack real implementado

---

### instructions.md
**Problemas:**
- Instrucciones del inicio del proyecto
- Flujo de trabajo antiguo
- No refleja estructura actual

**Reemplazo:** CLAUDE.md tiene instrucciones actualizadas

---

### AGENTS.md
**Problemas:**
- Sistema de "agents" cambiado completamente
- Ya no se usa esa arquitectura
- Funcionalidad diferente

**Estado:** Concepto de agents AI reemplazado

---

### COMPONENTS_GUIDE.md
**Problemas:**
- Guía de componentes UI antigua
- Componentes cambiaron significativamente
- Nueva arquitectura de componentes

**Reemplazo:** frontend_guidelines_document.md

---

### Documentos de Telefonía (3 archivos)

**ASTERISK_WEBRTC_ARCHITECTURE.md**
**TELEPHONY_SYSTEM_DOCUMENTATION.md**
**TRUNK_MANAGEMENT_GUIDE.md**

**Problemas:**
- Funcionalidad de telefonía NO implementada en versión actual
- Documentación preparatoria para features futuros
- Sistema actual NO tiene integración telefónica

**Estado:** Roadmap futuro - Fase 5 potencial

---

## Política de Deprecación

### ¿Cuándo deprecar un documento?

Un documento debe moverse a `deprecated/` cuando:
1. ✅ Ha sido completamente reemplazado por uno nuevo
2. ✅ Describe funcionalidad que ya no existe
3. ✅ Contiene información significativamente desactualizada
4. ✅ Puede causar confusión a nuevos desarrolladores

### ¿Qué hacer con documentos deprecados?

- ✅ Mover a `documentation/deprecated/`
- ✅ Agregar entrada en esta tabla
- ✅ Mantener documento original (no borrar)
- ✅ Actualizar referencias en docs activos

### ¿Cuándo borrar definitivamente?

**Nunca.** Estos documentos se mantienen indefinidamente por:
- Auditoría del proyecto
- Referencia histórica
- Trazabilidad de decisiones
- Contexto de arquitectura anterior

---

## Migración a Documentación Actual

Si estás leyendo un documento deprecado y necesitas la versión actual:

| Deprecado | → | Actual |
|-----------|---|--------|
| ARCHITECTURE.md | → | [ARQUITECTURA_SISTEMA.md](../02-architecture/ARQUITECTURA_SISTEMA.md) |
| RESUMEN_PROYECTO.md | → | [RESUMEN_EJECUTIVO_FINAL.md](../01-overview/RESUMEN_EJECUTIVO_FINAL.md) |
| PLAN_COMPLETO_DESARROLLO.md | → | [RESUMEN_EJECUTIVO_FINAL.md](../01-overview/RESUMEN_EJECUTIVO_FINAL.md) (Sección Sprints) |
| PROPOSICION_STACK_TECNOLOGICO.md | → | [tech_stack_document.md](../02-architecture/tech_stack_document.md) |
| instructions.md | → | [CLAUDE.md](../03-development/CLAUDE.md) |
| COMPONENTS_GUIDE.md | → | [frontend_guidelines_document.md](../03-development/frontend_guidelines_document.md) |

---

## Estadísticas

- **Total documentos deprecados:** 11
- **Fecha de deprecación masiva:** 26 Octubre 2025
- **Razón principal:** Reorganización profesional de documentación
- **Documentos activos:** 18
- **Documentos históricos:** 7

---

## Contacto

Si tienes preguntas sobre documentación deprecada o necesitas recuperar información:
- Consulta [documentation/README.md](../README.md)
- Revisa [RESUMEN_EJECUTIVO_FINAL.md](../01-overview/RESUMEN_EJECUTIVO_FINAL.md)

---

**Última Actualización:** 26 de Octubre 2025
**Mantenido por:** Equipo de Documentación Welcomedly
