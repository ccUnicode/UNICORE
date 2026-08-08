# Catálogo de Endpoints de la API — UNICORE

La especificación OpenAPI generada desde controllers, DTOs, enums y decoradores es el contrato técnico principal. Con el backend activo se encuentra en:

- Interfaz Swagger: `http://localhost:3001/api/docs`.
- Documento JSON: `http://localhost:3001/api/docs-json`.

Este archivo es la referencia humana complementaria: resume permisos, reglas y ejemplos que requieren contexto. Debe revisarse junto con el contrato generado cuando cambie un controller, DTO, enum o guard. Salvo las rutas marcadas como públicas, se requiere `Authorization: Bearer <accessToken>`. Los roles de área son `presidencia`, `directiva_de_area` y `miembro`.

## Convenciones de respuesta y error

- `200`: consulta o actualización exitosa; `201`: creación exitosa; los métodos `void` pueden responder sin cuerpo.
- `400`: parámetros enteros inválidos o body/query que no cumple el DTO. La `ValidationPipe` transforma valores y elimina propiedades no declaradas.
- `401`: token ausente, inválido, expirado o revocado; cuenta inactiva/deshabilitada; credenciales o secreto de bootstrap inválidos.
- `403`: rol o alcance de área/proyecto insuficiente.
- `404`: recurso relacionado inexistente.
- `409`: unicidad, estado o regla de negocio en conflicto.
- Las respuestas de entidades usan los nombres de las entidades/DTOs TypeScript (`studentCode`, `firstNames`, `isArchived`, `orderIndex`, etc.).

## Sistema y autenticación

| Método y ruta | Auth / roles | Entrada | Respuesta | Errores y reglas de negocio |
| :--- | :--- | :--- | :--- | :--- |
| `GET /` | Pública | — | Texto de health check | Sin reglas adicionales. |
| `POST /auth/bootstrap` | Pública | `BootstrapAuthDto`: `bootstrapSecret` (mín. 32), `password` (12–128) y exactamente uno de `memberId` o `member: CreateMemberDto` | `{ accessToken, tokenType: "Bearer", member }` | `401` secreto inválido; `409` si ya hay contraseña; el miembro debe ser UNI, activo, de `presidencia`, con `studentCode` y no deshabilitado. |
| `POST /auth/login` | Pública | `{ studentCode: string(1..20), password: string(12..128) }` | `{ accessToken, tokenType: "Bearer", member }` | Rate limiting por IP/cuenta; `401` para credenciales o estado no válidos. |
| `GET /auth/me` | Bearer; cualquier usuario activo | — | `MemberResponse` con membresías | El token debe coincidir con `sessionVersion`. |
| `PUT /auth/members/:memberId/password` | `presidencia` | Path `memberId` entero; body `{ password: string(12..128) }` | Sin cuerpo | Incrementa `sessionVersion` y revoca sesiones anteriores; `404` si no existe. |

## Áreas y membresías

| Método y ruta | Auth / roles | Entrada | Respuesta | Errores y reglas de negocio |
| :--- | :--- | :--- | :--- | :--- |
| `POST /areas` | `presidencia` | `{ name: string(1..255), description?: string(<=1000) }` | `Area` (`201`) | El nombre es único. |
| `GET /areas` | `presidencia`, `directiva_de_area` | Query `includeArchived=true|false` | `Area[]` accesible | Directiva obtiene únicamente su alcance; archivadas se excluyen salvo `true`. |
| `GET /areas/:id` | `presidencia`, `directiva_de_area` | Path `id` entero | `Area` | Directiva solo puede consultar su propia área. |
| `PATCH /areas/:id` | `presidencia` | Body parcial `{ name?, description? }` | `Area` | El nombre continúa siendo único. |
| `PATCH /areas/:id/archive` | `presidencia` | `{ confirmName: string(1..255) }` | `Area` con `isArchived: true` | `confirmName` debe coincidir exactamente con el nombre del área. |
| `POST /area-memberships` | `presidencia` | `{ memberId: int>0, areaId: int>0, role: AreaRole }` | `AreaMembership` (`201`) | Combinación miembro/área única; valida existencia y reglas del rol. |
| `PATCH /area-memberships/:id` | `presidencia` | `{ areaId?: int>0, role?: AreaRole }` | `AreaMembership` | Actualización parcial; conserva unicidad miembro/área. |
| `DELETE /area-memberships/:id` | `presidencia` | Path `id` entero; sin body | `AreaMembership` eliminado | No usa `confirmName`; valida que la eliminación no viole reglas organizacionales. |
| `GET /area-memberships` | `presidencia` | Query `page?` (>=1), `limit?` (1..100) | `{ data: AreaMembership[], meta: { total, page, limit, lastPage } }` | Paginación por defecto `page=1`, `limit=10`. |

## Miembros

`CreateMemberDto` requiere `firstNames`, `lastNames`, `major`, `birthDate` ISO y un arreglo no vacío de nombres de habilidades. `institution` vale `UNI` por defecto; para UNI, `studentCode` es obligatorio. `role` vale `miembro` por defecto. `directiva_de_area` exige `areaId`; `presidencia` no permite `areaId`.

| Método y ruta | Auth / roles | Entrada | Respuesta | Errores y reglas de negocio |
| :--- | :--- | :--- | :--- | :--- |
| `POST /members` | `presidencia` | `{ institution?, studentCode?, firstNames, lastNames, major, birthDate, role?, areaId?, skills: string[], activityStatus?, availabilityStatus?, cycle? }` | `MemberResponse` (`201`) | Habilidades se normalizan a minúsculas; valida unicidad institución/código y asignación de rol/área. |
| `GET /members` | `presidencia`, `directiva_de_area` | Query `activityStatus?`, `availabilityStatus?`, `areaId?`, `cycle?`, `skills?` repetible | `MemberResponse[]` | Directiva recibe solo miembros accesibles en su área. |
| `PATCH /members/:id` | `presidencia` | Body parcial de datos del miembro; `skills` son nombres, no IDs | `MemberResponse` | No modifica el rol directamente; la membresía controla roles. |
| `PATCH /members/:id/deactivate` | `presidencia`, `directiva_de_area` | `{ confirmName }` | `MemberResponse` con `activityStatus: "inactive"` | El texto debe ser exactamente `firstNames + " " + lastNames`; Directiva queda limitada a su área. |

### Habilidades no expuestas

El árbol fuente contiene `SkillsController` con `GET /skills` y `POST /skills`, pero no existe un `SkillsModule` registrado en `AppModule` ni otro módulo que declare ese controller. Por tanto, esas rutas no están expuestas por la aplicación actual y no se presentan como endpoints consumibles. Los nombres de habilidades se crean o reutilizan desde el flujo de miembros.

## Proyectos, fases y equipo

Estados de proyecto válidos: `planned`, `active`, `on_hold`, `completed`, `cancelled`. Roles de proyecto válidos: `representative`, `subrepresentative`, `member`. Directiva solo administra proyectos de su área; los miembros solo consultan proyectos en los que participan.

| Método y ruta | Auth / roles | Entrada | Respuesta | Errores y reglas de negocio |
| :--- | :--- | :--- | :--- | :--- |
| `POST /projects` | `presidencia`, `directiva_de_area` | `{ name, description?, startDate?, endDate?, areaId, labels?, links?: [{ name, url }] }` | `Project` con fases por defecto (`201`) | URL absoluta; máx. 20 labels/enlaces; Directiva solo crea en su área. Fases: `Planning`, `Execution`, `Review`, `Launch`. |
| `GET /projects` | Todos los roles | Query `page?`, `limit?`, `status?`, `areaId?`, `dateFrom?`, `dateTo?`, `labels?`, `search?`, `archived?` | Respuesta paginada de proyectos | Aplica alcance por rol; `archived` es boolean independiente de `status`. |
| `GET /projects/:id` | Todos los roles | Path `id` entero | Proyecto con relaciones de detalle | `miembro` debe pertenecer al proyecto; Directiva, al área. |
| `PATCH /projects/:id` | `presidencia`, `directiva_de_area` | Parcial `{ name?, description?: string|null, startDate?: string|null, endDate?: string|null, areaId?, status?, labels?, links? }` | Proyecto actualizado | Campos no anulables rechazan `null`; Directiva queda limitada a su área. |
| `PATCH /projects/:id/archive` | `presidencia`, `directiva_de_area` | Sin body | `Project` con `isArchived: true` | No cambia `status` ni requiere `confirmName`. |
| `GET /projects/:projectId/phases` | Todos los roles | Path `projectId` entero | `ProjectPhase[]` ordenado | Requiere acceso al proyecto. |
| `POST /projects/:projectId/phases` | `presidencia`, `directiva_de_area` | `{ name: string(1..255), description?: string(<=2000) }` | `ProjectPhase` (`201`) | `orderIndex` se asigna en el servicio. |
| `PATCH /projects/:projectId/phases/reorder` | `presidencia`, `directiva_de_area` | `{ phaseIds: int[] }`, no vacío y sin duplicados | `ProjectPhase[]` | Debe incluir una secuencia válida del proyecto. |
| `PATCH /projects/:projectId/phases/:phaseId` | `presidencia`, `directiva_de_area` | Parcial `{ name?, description? }` | `ProjectPhase` | La fase debe pertenecer al proyecto. |
| `DELETE /projects/:projectId/phases/:phaseId` | `presidencia`, `directiva_de_area` | Sin body | Sin cuerpo | No usa `confirmName`; el proyecto debe conservar al menos una fase y las tareas asociadas reciben `phaseId = null`. |
| `POST /projects/:id/members` | `presidencia`, `directiva_de_area` | `{ memberId: int, role: ProjectRole }` | `ProjectMembership` (`201`) | Miembro y proyecto deben existir; membresía única por miembro/proyecto. |
| `PATCH /projects/:id/members/:memberId` | `presidencia`, `directiva_de_area` | `{ role: ProjectRole }` | `ProjectMembership` | Actualiza el rol persistido del integrante. |
| `DELETE /projects/:id/members/:memberId` | `presidencia`, `directiva_de_area` | Sin body | Sin cuerpo | No usa `confirmName`; primero deben reasignarse las tareas del miembro. |

## Tareas y colaboración

Estados: `todo`, `in_progress`, `in_review`, `done`. Prioridades: `low`, `medium`, `high`, `urgent`. Aunque los controllers aceptan los tres roles de área, `TasksService` aplica el acceso y las capacidades dentro del proyecto.

| Método y ruta | Auth / roles | Entrada | Respuesta | Errores y reglas de negocio |
| :--- | :--- | :--- | :--- | :--- |
| `POST /tasks` | Todos los roles; acceso al proyecto | `{ projectId: int, phaseId?: int|null, title, description?: string|null, priority?, dueDate?: YYYY-MM-DD|null, assigneeIds: int[] }` | `Task` (`201`) | Al menos un asignado, todos deben pertenecer al proyecto; fase del mismo proyecto. |
| `GET /tasks` | Todos los roles; acceso al proyecto | Query **obligatorio** `projectId`; opcionales `page`, `limit`, `status`, `priority`, `phaseId`, `assigneeId`, `search` | Respuesta paginada de tareas | Sin `projectId` responde `400`. |
| `GET /tasks/:id` | Todos los roles; acceso al proyecto | Path `id` entero | Detalle de `Task` | Valida visibilidad del proyecto. |
| `PATCH /tasks/:id` | Todos los roles; capacidad de edición | Parcial `{ title?, description?: string|null, priority?, dueDate?: YYYY-MM-DD|null, phaseId?: int|null }` | `Task` | No modifica estado ni asignados; fase del mismo proyecto. |
| `PATCH /tasks/:id/status` | Todos los roles; capacidad de transición | `{ status: TaskStatus }` | `Task` | Registra `TaskStatusHistory` y auditoría cuando cambia el estado. |
| `PATCH /tasks/:id/assignees` | Todos los roles; capacidad de asignación | `{ memberIds: int[] }`, 1..50, únicos | `Task` con asignados | El campo es `memberIds`, no `assigneeIds`; exige membresía del proyecto. |
| `POST /tasks/:id/comments` | Todos los roles; acceso al proyecto | `{ content: string(1..2000) }` | `TaskComment` (`201`) | Usa al miembro autenticado como autor. |
| `GET /tasks/:id/comments` | Todos los roles; acceso al proyecto | Sin body | `TaskComment[]` | Orden cronológico según el servicio. |
| `GET /tasks/:id/status-history` | Todos los roles; acceso al proyecto | Sin body | `TaskStatusHistory[]` | Incluye `previousStatus`, `newStatus`, `actorId`, `createdAt`. |

## Auditoría

| Método y ruta | Auth / roles | Entrada | Respuesta | Errores y reglas de negocio |
| :--- | :--- | :--- | :--- | :--- |
| `GET /audit` | `presidencia`, `directiva_de_area` | Query `page?`, `limit?`, `actorId?`, `action?`, `entityType?`, `dateFrom?`, `dateTo?` | `{ data: AuditEvent[], meta: { total, page, limit, lastPage } }` | El filtro correcto es `entityType`, no `targetEntity`; Directiva solo ve eventos de su área. |
