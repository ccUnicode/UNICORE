# Catálogo de Endpoints de la API — UNICORE

Especificación técnica de los puntos de entrada (Endpoints REST) expuestos por el backend de UNICORE.

---

## 🔐 Módulo 1: Autenticación (`/auth`)

| Método | Ruta | Descripción | Auth Requerida | Body Esperado | Respuesta Exitosa (200/201) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/bootstrap` | Inicializa la cuenta admin de Presidencia si el sistema está vacío. | No | `{ uniCode, names, surnames, password }` | `{ message, member }` |
| `POST` | `/auth/login` | Inicia sesión y genera token JWT (Aplica Rate-limiting). | No | `{ uniCode, password }` | `{ accessToken, member }` |
| `GET` | `/auth/me` | Obtiene el perfil y permisos del usuario logueado. | Sí (Bearer) | N/A | `{ id, uniCode, roles, memberships }` |
| `PUT` | `/auth/members/:id/password` | Cambia la contraseña de un usuario. | Sí | `{ newPassword }` | `{ success: true }` |

---

## 🏢 Módulo 2: Áreas (`/areas` y `/area-memberships`)

| Método | Ruta | Descripción | Roles Permitidos | Body Esperado / Query | Respuesta |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/areas` | Crea una nueva área. | Presidencia | `{ name, description }` | `{ id, name, archived: false }` |
| `GET` | `/areas` | Lista todas las áreas activas. | Autenticado | `?includeArchived=true` | `[ { id, name, description } ]` |
| `GET` | `/areas/:id` | Obtiene el detalle de un área. | Autenticado | N/A | `{ id, name, description }` |
| `PATCH` | `/areas/:id` | Edita nombre o descripción de un área. | Presidencia, Directiva | `{ name, description }` | `{ id, name, description }` |
| `PATCH` | `/areas/:id/archive` | Archiva un área (borrado lógico). | Presidencia | N/A | `{ id, archived: true }` |
| `POST` | `/area-memberships` | Asigna un miembro a un área con un rol. | Presidencia, Directiva | `{ memberId, areaId, role }` | `{ id, memberId, areaId, role }` |
| `DELETE` | `/area-memberships/:id` | Remueve membresía de un área. | Presidencia, Directiva | Revisa `x-confirm-name` | `{ success: true }` |

---

## 👤 Módulo 3: Miembros y Habilidades (`/members` y `/skills`)

| Método | Ruta | Descripción | Roles Permitidos | Body Esperado | Respuesta |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/members` | Registra un nuevo miembro con competencias. | Presidencia, Directiva | `{ uniCode, names, surnames, career, birthDate, skillIds }` | `{ id, uniCode, names, status: 'active' }` |
| `GET` | `/members` | Lista y filtra miembros por competencias o estado. | Autenticado | `?skillId=...&status=active` | `[ { id, uniCode, names, availability } ]` |
| `PATCH` | `/members/:id` | Actualiza perfil de un miembro. | Presidencia, Propietario | `{ phone, cycle, skillIds, availability }` | `{ id, names, availability }` |
| `PATCH` | `/members/:id/deactivate` | Desactiva o inhabilita a un miembro. | Presidencia | `{ availability: 'disabled' }` | `{ id, availability: 'disabled' }` |
| `GET` | `/skills` | Lista catálogo de competencias (tags). | Autenticado | N/A | `[ { id, name } ]` |
| `POST` | `/skills` | Crea una nueva competencia. | Presidencia, Directiva | `{ name }` | `{ id, name }` |

---

## 🚀 Módulo 4: Proyectos y Fases (`/projects`)

| Método | Ruta | Descripción | Roles Permitidos | Body / Query | Respuesta |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/projects` | Crea un proyecto en un área. | Presidencia, Directiva | `{ name, description, areaId, startDate, endDate }` | `{ id, name, status: 'planning' }` |
| `GET` | `/projects` | Lista proyectos por área o estado. | Autenticado | `?areaId=...&status=active` | `[ { id, name, area, phases } ]` |
| `GET` | `/projects/:id` | Obtiene el detalle de un proyecto. | Autenticado | N/A | `{ id, name, phases, team }` |
| `PATCH` | `/projects/:id` | Actualiza datos del proyecto. | Presidencia, Directiva, Rep. | `{ name, description, status }` | `{ id, name, status }` |
| `PATCH` | `/projects/:id/archive` | Archiva un proyecto. | Presidencia, Directiva | N/A | `{ id, archived: true }` |
| `GET` | `/projects/:id/phases` | Lista fases del proyecto en orden. | Autenticado | N/A | `[ { id, name, order } ]` |
| `POST` | `/projects/:id/phases` | Crea una fase adicional. | Presidencia, Directiva, Rep. | `{ name, order }` | `{ id, name, order }` |
| `PATCH` | `/projects/:id/phases/reorder` | Reordena la secuencia de fases. | Presidencia, Directiva, Rep. | `{ phaseIds: [id1, id2] }` | `{ success: true }` |
| `POST` | `/projects/:id/members` | Agrega un miembro al equipo. | Presidencia, Directiva | `{ memberId, role }` | `{ id, memberId, role }` |
| `DELETE` | `/projects/:id/members/:memberId` | Quita un miembro del equipo. | Presidencia, Directiva | Revisa `x-confirm-name` | `{ success: true }` |

---

## 📋 Módulo 5: Tareas y Colaboración (`/tasks`)

| Método | Ruta | Descripción | Roles Permitidos | Body Esperado | Respuesta |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/tasks` | Crea una tarea dentro de una fase de proyecto. | Equipo del Proyecto | `{ title, description, projectId, phaseId, priority, assigneeIds }` | `{ id, title, status: 'todo' }` |
| `GET` | `/tasks` | Lista tareas con filtros por proyecto o prioridad. | Autenticado | `?projectId=...&status=in_progress` | `[ { id, title, priority, status } ]` |
| `GET` | `/tasks/:id` | Obtiene el detalle de una tarea. | Autenticado | N/A | `{ id, title, assignees, comments }` |
| `PATCH` | `/tasks/:id/status` | Cambia estado Kanban y registra historial. | Equipo del Proyecto | `{ status: 'in_review' }` | `{ id, status: 'in_review' }` |
| `PATCH` | `/tasks/:id/assignees` | Reasigna responsables de la tarea. | Rep, Subrep | `{ assigneeIds: [id1, id2] }` | `{ id, assignees }` |
| `POST` | `/tasks/:id/comments` | Agrega un comentario en el hilo de la tarea. | Equipo del Proyecto | `{ content }` | `{ id, content, author, createdAt }` |
| `GET` | `/tasks/:id/status-history` | Obtiene la trazabilidad de cambios de estado. | Autenticado | N/A | `[ { oldStatus, newStatus, changedBy, timestamp } ]` |

---

## 📜 Módulo 6: Auditoría (`/audit`)

| Método | Ruta | Descripción | Roles Permitidos | Query | Respuesta |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/audit` | Consulta el log de acciones del sistema. | Presidencia, Directiva | `?limit=50&targetEntity=projects` | `[ { id, action, entity, user, timestamp } ]` |
