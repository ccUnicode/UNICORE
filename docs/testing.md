# Documentación de Pruebas (Testing) — UNICORE

Este documento detalla la estrategia de pruebas automatizadas, los tipos de prueba implementados y los comandos para ejecutarlas en **UNICORE**.

La [referencia detallada de pruebas](pruebas-detalladas.md) explica requisitos de PostgreSQL desechable, aislamiento E2E, alcance de migraciones, OpenAPI y limitaciones. Antes de ejecutar `test:migrations`, configurar `TEST_DATABASE_URL` con un usuario con permiso `CREATEDB`; nunca usar bases compartidas.

---

## 🧪 Estrategia y Cobertura de Pruebas

El proyecto cuenta con un entorno de pruebas automatizado dividido en dos niveles:

1. **Backend (NestJS)**: Pruebas unitarias, de integración y de migraciones con **Jest** (el total vigente se obtiene del reporte de Jest).
2. **Frontend (Next.js)**: Pruebas unitarias e integración con el **Node.js Test Runner** nativo y `jsdom` (el total vigente se obtiene del reporte del runner).

---

## 🏃 Comandos para Ejecutar Pruebas

### 1. Ejecución Global desde la Raíz del Monorepo
Para validar todo el proyecto en una sola instrucción:

```bash
# Ejecutar verificación de tipos TypeScript
npm run type-check

# Ejecutar todas las suites de prueba (Backend + Frontend)
npm run test
```

### 2. Pruebas de Backend (`apps/backend`)

```bash
cd apps/backend

# Ejecutar todas las pruebas unitarias e integración
npm run test

# Ejecutar pruebas en modo observador (watch mode durante desarrollo)
npm run test:watch

# Generar reporte de cobertura de código
npm run test:cov

# Ejecutar validaciones de migraciones de base de datos
npm run test:migrations
```

### 3. Pruebas de Frontend (`apps/frontend`)

```bash
cd apps/frontend

# Ejecutar pruebas unitarias de utilidades, formularios y flujos UI
npm run test
```

---

## 📊 Tipos de Pruebas Existentes

### Backend (NestJS / Jest)
* **Guards & Auth**: `auth.guard.spec.ts`, `roles.guard.spec.ts`, `login-rate-limit.service.spec.ts`.
* **Servicios & Reglas de Negocio**: `members.service.spec.ts`, `projects.service.spec.ts`, `tasks.service.spec.ts`, `area.service.spec.ts`, `audit.service.spec.ts`.
* **Controladores & Respuestas HTTP**: `projects.controller.spec.ts`, `tasks.controller.spec.ts`, `members.controller.spec.ts`.
* **DTOs & Validaciones**: `create-project.dto.spec.ts`, `create-task.dto.spec.ts`, `confirm-name.dto.spec.ts`.
* **Migraciones SQL**: `1787788800000-MigrateMemberRolesAndAreas.spec.ts`, `1787788800002-AddTaskCollaboration.spec.ts`.

### Frontend (Next.js / Node Test Runner)
* **Login & Errores HTTP**: `login-validation.test.ts` (verifica validaciones de credenciales y mapeo de estados 401, 429, 500).
* **Directorio de Personas**: `people-management-utils.test.ts` (verifica que inactivos aparezcan al final y los filtros combinados).
* **Experiencia en Proyectos**: `project-experience.test.ts` (calcula proyectos activos vs archivados).
* **Colaboración en Tareas**: `task-collaboration.test.ts` y `task-management.test.tsx` (inserta comentarios cronológicamente e iguala respuestas del servidor).

---

## ⛔ Criterios Mínimos Antes de Merge (Quality Gates)

Ningún Pull Request debe integrarse a la rama `main` sin cumplir lo siguiente:

1. **Compilación Limpia**: `npm run type-check` debe terminar con código de salida `0`.
2. **0 Fallos en Pruebas**: Todas las suites ejecutadas deben pasar al 100%; las pruebas PostgreSQL requieren una base desechable explícita.
3. **No Regresiones**: Si se agrega un nuevo endpoint o regla de negocio en backend, se debe incluir su archivo `.spec.ts` correspondiente.
