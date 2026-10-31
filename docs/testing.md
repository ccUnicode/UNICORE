# Documentación de Pruebas (Testing) — UNICORE

Este documento detalla la estrategia de pruebas automatizadas, los tipos de prueba implementados y los comandos para ejecutarlas en **UNICORE**.

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


## Prueba de integración semanal

Ejecutar sobre el SHA vigente de `origin/main` después de las fusiones. Registrar fecha,
SHA y PR incluidos: una prueba de una rama aún abierta no acredita integración en main.
Si un requisito depende de un PR pendiente, marcar **pendiente de fusión**, no OK.
No vaciar una base existente ni ejecutar `docker compose down -v` sobre datos del equipo.

### Preparación aislada

Desde un checkout limpio y actualizado, instalar con `npm ci`. Crear una base exclusiva:

```bash
docker run --rm -d --name unicore-weekly-qa \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=local-qa-only \
  -e POSTGRES_DB=unicore_qa -p 127.0.0.1:55432:5432 postgres:16-alpine
```

Esperar `docker exec unicore-weekly-qa pg_isready -U postgres -d unicore_qa`.
Configurar en la terminal del backend `DATABASE_URL` hacia esa base, `DATABASE_SSL=false`,
`NODE_ENV=test`, `PORT=3301` y secretos JWT/bootstrap exclusivos de prueba (mínimo 32 caracteres).
Usar `test` permite probar las migraciones: `development` activa sincronización y no sirve
como evidencia de migración. Ejecutar `npm run build -w backend` y `npm run start:prod -w backend`.
En otra terminal, ejecutar `NEXT_PUBLIC_API_URL=http://localhost:3301 npm run dev -w frontend -- --port 3300`.
Usar únicamente personas ficticias y contraseñas desechables; no adjuntar tokens ni secretos.

### Guion y evidencias

| Paso | Acción | Resultado esperado / evidencia |
| --- | --- | --- |
| 1 | Registrar SHA de main y arrancar PostgreSQL vacío aislado. | Base de QA identificada; ninguna base del equipo alterada. |
| 2 | Arrancar backend, consultar migraciones y reiniciarlo. | Migraciones registradas una vez; segundo arranque sin pendientes. Incluir 0009 cuando #109 esté fusionado. |
| 3 | Crear primera Presidencia con `POST /auth/bootstrap`, objeto `member`, `password` y `bootstrapSecret`; iniciar sesión. | Sesión válida; capturar pantalla sin credenciales. Ver contrato en [endpoints](endpoints.md). |
| 4 | Crear área, miembro y proyecto desde Presidencia. Dar contraseña de prueba al miembro mediante `PUT /auth/members/:memberId/password`. | Recursos persistidos y visibles al recargar. |
| 5 | Abrir fases del proyecto nuevo. | Planificación, Ejecución, Revisión y Lanzamiento; captura. Depende de #109. |
| 6 | Completar la carga de un miembro hasta No disponible y agregarlo a otro equipo. | Incorporación permitida, sin error de disponibilidad. Depende de #103. |
| 7 | Asignarle una tarea; luego editar una tarea que conserve un responsable inhabilitado existente. | No disponible se asigna; inhabilitado existente se conserva, uno nuevo se rechaza. Depende de #108. |
| 8 | Iniciar sesión con un miembro sin tareas activas (Inactivo). | Inicio de sesión permitido. No confundir Inactivo con Inhabilitado. |
| 9 | Entrar como Miembro, abrir perfil propio y URL de otro perfil; repetir con Presidencia. Inspeccionar `/auth/me`, `/members` y `/projects/:id`. | Miembro no recibe código UNI, competencias ni estados internos. `/members` y otro perfil pueden estar denegados (403 / Acceso restringido). Presidencia ve datos internos en directorio/perfil. Captura por rol. |
| 10 | Cambiar estados de tareas y comprobar avance de fase/proyecto. | Cálculo coherente con FR-43/44, solo si S4-B1 ya está fusionado. |

Formato de registro: `fecha | SHA | paso | OK / falla / pendiente de fusión | evidencia`.
Ante una falla real en cambios ya integrados, registrar reproducción, esperado/actual y
crear tarjeta Bug; no confundir una dependencia no fusionada con una regresión.
El informe debe separar comprobación API, prueba automatizada y verificación en navegador.

### Controles automáticos y limpieza

Ejecutar type-check, lint, test y build de ambas aplicaciones según [CONTRIBUTING](../CONTRIBUTING.md).
Para migraciones reales, usar `TEST_DATABASE_URL` apuntando al PostgreSQL desechable y
`npm run test:migrations -w backend`; las suites crean sus bases temporales.
Cerrar los procesos locales y ejecutar `docker stop unicore-weekly-qa` al terminar:
`--rm` elimina únicamente el contenedor desechable creado arriba.
