# Documentación del Backend de UNICORE

El backend de **UNICORE** es una API REST construida con NestJS 11 y TypeORM sobre PostgreSQL.

---

## Stack del Backend

* **Framework**: NestJS 11
* **Lenguaje**: TypeScript 5.7
* **ORM**: TypeORM 0.3
* **Base de datos**: PostgreSQL 16
* **Autenticación**: JWT HS256 implementado por `AuthTokenService` con `crypto.createHmac` + `scrypt` para contraseñas; el proyecto no depende de `@nestjs/jwt`.
* **Validaciones**: `class-validator` y `class-transformer`

---

## Estructura de Carpetas (`apps/backend/src/`)

```text
src/
├── main.ts                       # Punto de entrada de la aplicación NestJS
├── app.module.ts                 # Módulo raíz y configuración global de TypeORM/Config
├── app.controller.ts             # Health check (GET /)
├── app.service.ts
├── area/                         # Módulo de Áreas
│   ├── area.controller.ts        # Endpoints /areas
│   ├── area.service.ts           # Lógica CRUD de áreas
│   ├── area.module.ts
│   ├── dto/                      # DTOs de creación y edición
│   └── entities/                 # Entidad Area
├── area-memberships/             # Módulo de Membresía Multi-área
│   ├── area-memberships.controller.ts
│   ├── area-memberships.service.ts
│   └── entities/                 # Entidad AreaMembership
├── audit/                        # Módulo de Log de Auditoría
│   ├── audit.controller.ts
│   ├── audit.service.ts
│   └── entities/                 # Entidad AuditEvent
├── auth/                         # Autenticación y Seguridad
│   ├── auth.controller.ts        # /auth/login, /auth/bootstrap, /auth/me
│   ├── auth.service.ts
│   ├── auth.guard.ts             # Guard de verificación de Token JWT
│   ├── password.service.ts       # Hash y verificación scrypt
│   └── login-rate-limit.service.ts # Rate limiting anti fuerza bruta
├── common/                       # Utilidades comunes y Guards globales
│   ├── decorators/               # Decorador @Roles()
│   ├── dto/                      # DTOs reutilizables (ConfirmNameDto)
│   └── guards/                   # RolesGuard (RBAC por área y proyecto)
├── members/                      # Módulo de Miembros y Perfiles
│   ├── members.controller.ts
│   ├── members.service.ts
│   └── member.entity.ts
├── migrations/                   # Migraciones de datos e historial SQL
├── projects/                     # Módulo de Proyectos, Fases y Equipos
│   ├── projects.controller.ts
│   ├── projects.service.ts
│   └── entities/                 # Project, ProjectPhase, ProjectMembership, ProjectLabel
├── skills/                       # Módulo de Competencias / Habilidades
│   ├── skills.controller.ts
│   ├── skills.service.ts
│   └── skill.entity.ts
└── tasks/                        # Módulo de Tareas, Comentarios e Historial
    ├── tasks.controller.ts
    ├── tasks.service.ts
    └── entities/                 # Task, TaskAssignee, TaskComment, TaskStatusHistory
```

---

## Módulos Principales y Seguridad

### 1. Módulo Auth (`auth/`)
Gestiona el acceso al sistema.
* **`POST /auth/bootstrap`**: Inicializa la cuenta admin global cuando el sistema está recién instalado.
* **`POST /auth/login`**: Valida credenciales (`studentCode` y `password`), aplica rate limiting por cuenta e IP y retorna el token JWT.
* **`GET /auth/me`**: Retorna el perfil y roles activos del usuario autenticado.
* **`PUT /auth/members/:memberId/password`**: Permite cambiar la contraseña de un miembro.

### 2. Módulo Area (`area/` y `area-memberships/`)
Administra la estructura organizativa de UNICODE.
* Permite que un miembro pertenezca a más de un área simultáneamente (`area_memberships`).
* Define roles por área: `presidencia`, `directiva_de_area` y `miembro`.

### 3. Módulo Members (`members/` y `skills/`)
Gestiona el catálogo de personas.
* Registro obligatorio con Código UNI, Nombres, Apellidos, Carrera, Fecha de Nacimiento y Competencias (`skills`).
* Estados de **Actividad**: `active` / `inactive`.
* Estados de **Disponibilidad**: `available`, `not_available`, `disabled` (Inhabilitado bloquea acceso manteniendo trazabilidad).

### 4. Módulo Projects (`projects/`)
Administra los proyectos de la organización.
* Cada proyecto pertenece a una sola área.
* Soporta **Fases del Proyecto** (fases predeterminadas: `Planning`, `Execution`, `Review`, `Launch`).
* Soporta **Equipos por Proyecto** con roles: `representative`, `subrepresentative`, `member`.

### 5. Módulo Tasks (`tasks/`)
Administra el trabajo operativo mediante flujo de estados Kanban: `todo`, `in_progress`, `in_review`, `done`.
* Asignación de responsables múltiples (`task_assignees`).
* Hilo de comentarios por tarea (`task_comments`).
* Registro histórico automático de quién cambió el estado y cuándo (`task_status_history`).

### 6. Módulo Audit (`audit/`)
Registra todas las acciones clave del sistema (`audit_events`) especificando fecha, hora, usuario, entidad afectada y tipo de acción. Presidencia puede consultar la auditoría global y Directiva a nivel de su área.

---

## Guards y Decoradores de Permisos

NestJS utiliza dos guards en cascada:
1. **`AuthGuard`**: Extrae el token JWT del encabezado `Authorization: Bearer <token>` y adjunta el `user` a la petición.
2. **`RolesGuard`**: Evalúa si el usuario autenticado tiene el rol requerido y, cuando se configura `@AccessScope`, limita el acceso por área o proyecto (ejemplo: `@Roles(AreaRole.PRESIDENCIA, AreaRole.DIRECTIVA_DE_AREA)`).

> **Nota sobre habilidades:** existen `SkillsController` y `SkillsService` en `src/skills/`, pero ningún módulo registrado en `AppModule` declara ese controller. Por ello `/skills` no forma parte de la API expuesta en el estado actual.

---

## Comandos Backend

```bash
# Desarrollo
npm run start:dev

# Compilar para producción
npm run build

# Ejecutar pruebas unitarias NestJS
npm run test

# Probar migraciones
npm run test:migrations
```
