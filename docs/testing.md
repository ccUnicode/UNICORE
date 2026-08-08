# Estrategia de pruebas de UNICORE

Este documento explica qué valida cada conjunto de pruebas, cómo ejecutarlo y qué condiciones debe cumplir una contribución antes de integrarse.

## Alcance

UNICORE usa mecanismos distintos por aplicación:

- Backend: Jest con pruebas unitarias y de integración de componentes NestJS.
- Frontend: Node.js Test Runner después de compilar los archivos definidos por `tsconfig.test.json`.
- Migraciones: Jest contra una instancia real y desechable de PostgreSQL.
- E2E del backend: Supertest mediante la configuración `test/jest-e2e.json`; se ejecuta de forma explícita y no forma parte de `npm run test`.

Las cantidades de suites y casos cambian con el código. El resultado actual debe obtenerse de la salida del comando o de GitHub Actions; no se mantiene un número fijo en este documento.

## Requisitos

Para las validaciones ordinarias:

- Node.js y npm en las versiones indicadas por el README.
- Dependencias instaladas con `npm ci` en CI o `npm install` durante desarrollo.

Para las pruebas de migraciones:

- PostgreSQL disponible.
- Una base exclusiva y desechable.
- `TEST_DATABASE_URL` apuntando a esa base.
- Permiso para crear, alterar y eliminar objetos dentro de ella.

No ejecutar pruebas de migraciones contra una base compartida, de desarrollo con datos importantes o de producción.

Ejemplo local:

```env
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/unicore_test
```

## Comandos desde la raíz

```bash
# TypeScript de todos los workspaces
npm run type-check

# Lint de todos los workspaces
npm run lint

# Pruebas ordinarias de backend y frontend
npm run test

# Builds de producción
npm run build

# Integración de migraciones; requiere TEST_DATABASE_URL
npm run test:migrations --workspace=apps/backend
```

El comando raíz `npm run test` no ejecuta `test:migrations` ni `test:e2e`. Esas validaciones deben invocarse por separado cuando correspondan.

## Backend

Desde `apps/backend`:

```bash
npm run type-check
npm run lint
npm run test
npm run test:watch
npm run test:cov
npm run test:e2e
npm run test:migrations
```

### Pruebas unitarias y de integración

`npm run test` usa la configuración Jest declarada en `apps/backend/package.json` y busca archivos `*.spec.ts` dentro de `src/`.

La cobertura actual incluye, entre otros:

- Autenticación, tokens, contraseñas y rate limiting.
- Guards y alcance por rol.
- Servicios y controladores de áreas, miembros, proyectos, tareas y auditoría.
- DTOs y reglas de validación.
- Comportamiento aislado de migraciones.
- Configuración de la publicación OpenAPI.

Para ejecutar una prueba focalizada:

```bash
npm run test -- --runInBand src/auth/auth.service.spec.ts
```

### Pruebas E2E

`npm run test:e2e` usa `apps/backend/test/jest-e2e.json` y ejecuta los archivos `*.e2e-spec.ts`, excepto la suite específica de migraciones. Estas pruebas levantan la aplicación NestJS dentro del proceso de Jest y deben mantener aislados sus datos.

### Pruebas de migraciones

`npm run test:migrations` usa `apps/backend/test/jest-migrations.json` y ejecuta `task-collaboration-migration.e2e-spec.ts` contra `TEST_DATABASE_URL`.

La suite debe comprobar tanto el avance como la reversión del esquema que cubre. Cuando se agregue una migración nueva, debe añadirse o extenderse una prueba que parta de un estado representativo del esquema anterior.

## Frontend

Desde `apps/frontend`:

```bash
npm run type-check
npm run lint
npm run test
npm run build
```

`npm run test` compila primero el conjunto configurado por `tsconfig.test.json` y después ejecuta Node.js Test Runner sobre los archivos generados en `.test-dist`.

Las pruebas actuales cubren:

- Validación del login y mapeo de errores HTTP.
- Filtros y ordenamiento de miembros.
- Clasificación de experiencia en proyectos.
- Comentarios de tareas.
- Cambios de estado y comportamiento del tablero de tareas.

Al añadir un archivo de prueba frontend, actualizar el script `test` o la configuración correspondiente para asegurar que realmente se ejecute.

## Validaciones de Pull Request

El workflow `.github/workflows/pull-request-checks.yml` ejecuta:

- Type-check, lint, test y build del backend.
- Type-check, lint, test y build del frontend.
- Prueba de integración de migraciones con PostgreSQL de servicio.

Un check verde indica que esos comandos terminaron correctamente, pero no reemplaza la revisión de contratos, permisos, migraciones, documentación ni casos no cubiertos.

## Criterios antes de integrar

- Todos los checks requeridos deben finalizar correctamente.
- Una nueva regla de negocio debe incluir pruebas del caso exitoso y de sus rechazos relevantes.
- Un nuevo endpoint debe probar autenticación, autorización, validación y respuesta cuando corresponda.
- Un cambio de entidad debe incluir una migración revisable y su validación de avance y reversión.
- Un cambio de contrato debe actualizar OpenAPI, la referencia humana y la colección de API cuando aplique.
- No deben quedar pruebas omitidas, exclusiones temporales ni comandos que oculten errores.

## Cobertura y limitaciones

El proyecto no define actualmente un porcentaje mínimo de cobertura. `npm run test:cov --workspace=apps/backend` genera el reporte disponible para evaluar áreas sin pruebas.

Limitaciones conocidas:

- El frontend usa un conjunto explícito de archivos de prueba y no descubre automáticamente cualquier `*.test.ts(x)` nuevo.
- Las pruebas ordinarias no validan por sí solas una actualización desde una copia de un ambiente real.
- La especificación OpenAPI requiere revisión semántica adicional para describir todas las respuestas y reglas de negocio.

## Mantenimiento

Actualizar este documento cuando cambien scripts, configuraciones Jest, archivos incluidos por el frontend, servicios de CI o requisitos de base de datos. Las fuentes de verdad son los `package.json`, las configuraciones de pruebas y `.github/workflows/pull-request-checks.yml`.
