# Backend en Vercel y migraciones de despliegue

Implementación de S6-D2 y S6-D3 (#135 y #136). La guía general de Vercel y Neon
se mantiene en el PR #142, `docs/despliegue-vercel-neon.md`. Este documento
describe la configuración que consume el backend de esta rama.

## Entrada nativa de NestJS

Vercel reconoce `apps/backend/src/main.ts` como entrada y convierte la aplicación
en una función. Se conserva `app.listen()` para desarrollo y para la integración
nativa. `configureApp(app)` aplica CORS y ValidationPipe en ambos entornos.
La plataforma administra la instancia de la función, sin un adaptador manual ni
reescrituras hacia `/api`. Las rutas conservan sus nombres (`/auth/login`, `/areas`, etc.).

Referencia: [NestJS en Vercel](https://vercel.com/docs/frameworks/backend/nestjs).
La elección del soporte nativo sigue la actualización de #135. No se agregan
`serverless.ts` ni `api/index.js` porque corresponden a la alternativa manual.

## Proyecto backend

En la configuración del proyecto Vercel:

- Root Directory: `apps/backend`.
- Framework Preset: NestJS.
- Habilitar acceso a archivos fuera del directorio raíz para los workspaces y el lockfile del monorepo.
- Instalación: `npm ci` desde la raíz del repositorio (Vercel detecta los workspaces).
- Build Command: `npm run build:vercel`, definido también en `apps/backend/vercel.json`.
- Output Directory: valor predeterminado del framework.
- Duración máxima: 60 segundos para `src/main.ts`, definida en `vercel.json`.
- Usar Node.js 22, como `.nvmrc` y CI.

El comando compila el backend y después ejecuta `migration:deploy`. Si falla
la compilación, falta la conexión directa o falla una migración, el comando
termina con error y el despliegue no debe promoverse.

## Variables

Los valores se cargan directamente en Vercel. No copiar conexiones ni secretos
a GitHub, Drive o Linear. Cada alcance debe configurarse por separado.

| Variable | Local, si se omite | Vercel |
| --- | --- | --- |
| `NODE_ENV` | Solo `development` activa sincronización | `production` |
| `DATABASE_URL` | Conexión PostgreSQL existente | URL con pooler de la rama correspondiente |
| `DATABASE_URL_UNPOOLED` | No se necesita para `start:dev` | URL directa de esa misma rama, obligatoria para `migration:deploy` |
| `DATABASE_SSL` | Desactivado salvo `true` | `true` para Neon |
| `DATABASE_MIGRATIONS_RUN` | `false` en development, `true` en otros entornos | `false`: la función no ejecuta migraciones al arrancar |
| `DATABASE_POOL_MAX` | Pool predeterminado del controlador | `1` o `2`, entero positivo |
| `CORS_ORIGIN` | CORS abierto, como antes | Origen exacto del frontend, con protocolo y sin barra final |
| `AUTH_JWT_SECRET` | Secreto local de al menos 32 caracteres | Secreto propio del entorno |
| `AUTH_BOOTSTRAP_SECRET` | Secreto local de al menos 32 caracteres | Secreto propio del entorno |
| `AUTH_JWT_EXPIRES_IN_SECONDS` | Valor existente del servicio | Duración acordada para el entorno |

`DATABASE_MIGRATIONS_RUN` solo acepta `true` o `false`.
`DATABASE_POOL_MAX` rechaza valores vacíos, cero, negativos o fraccionarios.
La sincronización sigue reservada a `NODE_ENV=development`.

Production debe apuntar a la rama `main` de Neon y Preview a `pruebas`.
`migration:deploy` nunca usa `DATABASE_URL` como respaldo: exige
`DATABASE_URL_UNPOOLED`, desactiva sincronización y usa las migraciones registradas
en el backend. La segunda ejecución consulta el historial y no repite las aplicadas.
El comando no puede deducir si una conexión pertenece a producción: el aislamiento
depende de configurar y verificar correctamente los alcances en Vercel.

`CORS_ORIGIN` admite un origen por entorno. Para probar Preview usar un origen
estable del frontend de pruebas o actualizarlo para la URL concreta de esa prueba.
Un origen diferente no obtiene permiso del navegador para leer respuestas.
CORS no sustituye la autenticación ni los permisos del backend.

## Verificación

Desde la raíz:

```sh
npm ci
npm run type-check
npm run lint
npm test
npm run build
```

Con `TEST_DATABASE_URL` apuntando a PostgreSQL desechable con permiso de crear bases:

```sh
npm run test:migrations -w backend
```

La suite crea bases aisladas y comprueba migraciones iniciales, segunda ejecución
sin cambios, arranque del backend sin migraciones y ausencia de diferencias con
las entidades. Para comprobar además la entrada compilada, cargar las variables
de una base desechable y ejecutar dos veces desde `apps/backend`:

```sh
npm run build:vercel
npm run migration:deploy
```

En local siguen disponibles `npm run start:dev -w backend` y
`npm run start:prod -w backend`. Con una base vacía, comprobar el arranque,
`POST /auth/bootstrap` y el inicio de sesión. No usar datos reales.

## Validación publicada pendiente

Las pruebas locales no acreditan el despliegue en Vercel. S6-D4 configura los
proyectos y S6-D7 registra dos despliegues y la separación de bases. Allí verificar:

1. Detección nativa, construcción y acceso a las rutas públicas del backend.
2. Primer despliegue que aplica el esquema y segundo que no repite migraciones.
3. Un dato de Preview aparece en `pruebas` y no en producción.
4. CORS desde el frontend publicado y rechazo de lectura desde otro origen.

Registrar resultados y capturas sin valores sensibles en las tarjetas de Linear.
Las cuentas, los accesos y las decisiones internas permanecen en DES-01 de Drive.
