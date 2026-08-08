# Registro de Deuda Técnica y Roadmap V2 — UNICORE

Este documento centraliza los ítems de deuda técnica identificados en la versión actual (V1) y las funcionalidades planificadas para la **Versión 2 (V2)** según el documento completo de requerimientos organizacionales.

---

## 📌 Estado de Cobertura de Requerimientos

* **Versión 1 (Actual)**: Cobertura del **~75%** de los requerimientos totales. Cubre al 100% la base operativa del sistema (Áreas, Miembros, Membresías multi-área, Proyectos, Equipos, Fases, Tareas Kanban, Comentarios, Auditoría y RBAC).
* **Versión 2 (Pendiente)**: **~25%** restante orientado a métricas avanzadas, automatizaciones e integraciones externas.

---

## 📋 Funcionalidades Pendientes para V2 (Priorizadas)

### 🔴 Prioridad 1: Módulo de Participación (FR-48 a FR-51)
* **Descripción**: Registrar y consultar la participación de los miembros en la comunidad.
* **Items**:
  * **FR-48**: Registro automático de participación por contribución a tareas o proyectos.
  * **FR-49**: Registro manual de asistencia/participación por actividad (con fecha y evento).
  * **FR-50 / FR-51**: Vistas de consulta y generación de reportes de participación por período y miembro.
* **Impacto**: Permitirá evaluar la actividad real de los miembros para asignaciones futuras.

### 🟡 Prioridad 2: Milestones, Versiones y Progreso Ponderado (FR-45 a FR-47)
* **Descripción**: Gestión de versiones de proyectos y cálculo de avance ponderado.
* **Items**:
  * **FR-46 / FR-47**: Definir entidades de `Version` / `Milestone` y asociar tareas.
  * **FR-45**: Algoritmo de porcentaje de avance por peso de prioridad (Baja=1, Media=2, Alta=3, Urgente=5).
* **Impacto**: Mejorará el seguimiento de entregas por release en proyectos de software.

### 🟡 Prioridad 3: Evidencias en Tareas y Plantillas Reutilizables (FR-37, FR-42, FR-53, FR-60)
* **Descripción**: Estandarización de creación de proyectos y aseguramiento de entregables.
* **Items**:
  * **FR-60**: Permitir adjuntar evidencia (link o archivo) en tareas y configurar si es obligatoria para pasar a *Hecho*.
  * **FR-37 / FR-42 / FR-53**: Administrar plantillas dinámicas de proyectos, fases e issues por área.
* **Impacto**: Facilita la creación rápida de proyectos recurrentes.

### 🟢 Prioridad 4: Integraciones Externas y Webhooks (FR-63 a FR-69)
* **Descripción**: Conexión con servicios externos (GitHub/GitLab).
* **Items**:
  * **FR-64 / FR-65**: Vincular tareas con ramas, commits o Pull Requests externos mediante URL o ID.
  * **FR-66 / FR-67**: Actualización automática de estado de tareas vía Webhooks (ej. PR creado -> *En revisión*, PR merged -> *Hecho*).
* **Impacto**: Automatización para equipos de desarrollo (Baja prioridad inicial).

---

## 🛠️ Deuda Técnica de Código e Infraestructura

### [TD-001] Desactivación de `synchronize: true` en Producción
* **Área**: Backend / BD (`app.module.ts`)
* **Impacto Estimado**: Alto para ambiente productivo.
* **Descripción**: Actualmente `synchronize: true` está habilitado en TypeORM para desarrollo rápido.
* **Solución Propuesta**: Configurar `synchronize: false` mediante variable de entorno `NODE_ENV=production` y forzar la ejecución exclusiva de archivos de migración (`migrationsRun: true`).

### [TD-002] Migración a OpenAPI / Swagger
* **Área**: Backend (`main.ts`)
* **Impacto Estimado**: Medio.
* **Descripción**: Los endpoints están documentados manualmente en `docs/endpoints.md`.
* **Solución Propuesta**: Instalar `@nestjs/swagger` para generar automáticamente la especificación OpenAPI en `/api/docs`.
