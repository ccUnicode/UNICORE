# DES-01 · Despliegue en Vercel y Neon

**Guía técnica · 24 de noviembre de 2026 · [UNI2-163](https://linear.app/id-unicode/issue/UNI2-163)**

Esta guía documenta cómo reproducir, verificar y recuperar el despliegue de prueba de UNICORE. El primer despliegue se hizo desde `main` con el commit `1692a5f`, que incluye la [adaptación a Vercel](https://github.com/ccUnicode/UNICORE/pull/164) y el [ajuste del preset NestJS](https://github.com/ccUnicode/UNICORE/pull/167).

## Arquitectura y entornos

| Componente | Configuración del despliegue de prueba |
| --- | --- |
| Web | Proyecto Vercel `unicore`, raíz `apps/frontend`, preset Next.js, Node.js 22.x. |
| API | Proyecto Vercel `unicore-api`, raíz `apps/backend`, preset NestJS, Node.js 22.x. |
| Base de datos | Proyecto Neon `unicore`, PostgreSQL 16, región AWS US East 1 (N. Virginia), base `unicore`. |
| Repositorio | Ambos proyectos se conectan a `ccUnicode/UNICORE`, con `main` como rama de Production en Vercel. |

Según el registro del primer despliegue, **Production y Preview de Vercel usan la rama `pruebas` de Neon**. La rama `production` de Neon quedó vacía y reservada para el uso real. Los builds de la API en ambos entornos pueden modificar el esquema de `pruebas`.

| Entorno | Durante el piloto | Antes de cargar datos reales |
| --- | --- | --- |
| Vercel Production | API con ambas conexiones de la rama Neon `pruebas`. Web de prueba y API pública de prueba. | API con ambas conexiones de la rama Neon `production`. Configurar el par de URLs y secretos de producción. |
| Vercel Preview | API con ambas conexiones de `pruebas`. Cada web debe apuntar a la API de prueba permitida. | Mantener ambas conexiones en `pruebas` y verificar el aislamiento en [UNI2-181](https://linear.app/id-unicode/issue/UNI2-181). |
| Desarrollo local | PostgreSQL local o base desechable y API local. | Usar datos ficticios. |

CORS admite un origen por backend. Las URLs de Preview cambian entre despliegues. Antes de habilitar un Preview por PR, definir en UNI2-181 cómo se asignan `NEXT_PUBLIC_API_URL` y `CORS_ORIGIN` al par correcto.

## Variables de entorno

Configurar cada variable en el entorno de Vercel que la usa. Las dos conexiones PostgreSQL de cada entorno deben apuntar a la misma rama de Neon. Cargar los secretos en el panel de Vercel y guardar los accesos por el canal privado autorizado.

| Variable | Componente | Configuración |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Web | URL de la API del mismo entorno, con HTTPS y sin barra final. Next.js la incorpora al build. Volver a publicar la web después de cambiarla. |
| `NODE_ENV` | API | `production` en Production y Preview. `development` activa la sincronización de esquema y se reserva para desarrollo local. |
| `DATABASE_URL` | API | Secreto. Conexión con pooler para las solicitudes de la API. |
| `DATABASE_URL_UNPOOLED` | Build de la API | Secreto. Conexión directa que exige `migration:deploy`. |
| `DATABASE_SSL` | API | `true` en Neon. La opción del driver se configura con `rejectUnauthorized: false` en el código actual. |
| `DATABASE_MIGRATIONS_RUN` | API | `false`. El build aplica las migraciones pendientes y las instancias de NestJS arrancan con el esquema ya migrado. |
| `DATABASE_POOL_MAX` | API | `5` en la configuración validada de prueba. Con `1`, la edición de un proyecto se bloqueó cuando hubo consultas fuera de la transacción (H-09). |
| `CORS_ORIGIN` | API | Origen exacto de la web, con HTTPS y sin barra final. Si se omite, el backend habilita CORS sin restringir el origen. |
| `AUTH_JWT_SECRET` | API | Secreto aleatorio de al menos 32 caracteres, distinto por entorno. Rotarlo invalida las sesiones existentes. |
| `AUTH_JWT_EXPIRES_IN_SECONDS` | API | `3600` en la prueba. El código acepta enteros desde 60 segundos. |
| `AUTH_BOOTSTRAP_SECRET` | API | Secreto aleatorio de al menos 32 caracteres, independiente del JWT y distinto por entorno. La API lo exige al arrancar. |
| `PORT` | API local | Puerto del proceso NestJS en desarrollo. El enrutamiento del despliegue lo gestiona Vercel. |

Las variables `AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS`, `AUTH_LOGIN_RATE_LIMIT_MAX_ATTEMPTS_PER_IP`, `AUTH_LOGIN_RATE_LIMIT_MAX_ATTEMPTS_PER_ACCOUNT`, `AUTH_LOGIN_RATE_LIMIT_MAX_CONCURRENT`, `AUTH_LOGIN_RATE_LIMIT_MAX_CONCURRENT_PER_IP` y `AUTH_LOGIN_RATE_LIMIT_MAX_CONCURRENT_PER_ACCOUNT` aceptan enteros positivos y tienen valores por defecto. El limitador conserva su estado en memoria de cada instancia.

[Plantilla del backend](../apps/backend/.env.example) · [Configuración de PostgreSQL](../apps/backend/src/database/database-options.ts) · [Configuración de migraciones](../apps/backend/src/database/deployment-options.ts) · [Configuración CORS](../apps/backend/src/configure-app.ts) · [Cliente web](../apps/frontend/src/lib/auth-client.ts)

## Procedimiento de despliegue

1. **Verificar el commit.** Confirmar que el SHA contiene los cambios de los PR #164 y #167. Ejecutar los controles de [CI y pruebas](testing.md), incluida la prueba de migraciones con PostgreSQL desechable.
2. **Preparar Neon.** Crear el proyecto con la configuración indicada arriba y crear `pruebas` como rama hija de `production`, sin borrado automático. Obtener de Neon una conexión con pooler y otra directa de `pruebas`, ambas con TLS, y cargarlas como secretos según la tabla. Generar por separado los secretos de JWT y bootstrap.
3. **Conectar GitHub.** Un Owner de `ccUnicode` autoriza a la integración GitHub de Vercel sobre el repositorio y verifica que la cuenta de GitHub vinculada tenga permiso **Write**. Si el repositorio no aparece al importarlo, revisar **Adjust GitHub App Permissions**.
4. **Publicar la API.** Importar el repositorio con raíz `apps/backend` y habilitar **Include files outside the Root Directory** para el lockfile y los workspaces del monorepo. Cargar las variables de la API para cada entorno. [`vercel.json`](../apps/backend/vercel.json) configura NestJS, `npm ci --include=dev` y `npm run build:vercel`. El build compila y luego ejecuta `migration:deploy` por la conexión directa. Si una migración falla, falla el build. Confirmar la rama de destino antes de cada build y evitar builds simultáneos que migren la misma rama.
5. **Publicar la web.** Importar el mismo repositorio con raíz `apps/frontend`, preset Next.js y `NEXT_PUBLIC_API_URL` configurada con la URL de la API. Al obtener la URL de la web, agregar su origen a `CORS_ORIGIN` y volver a desplegar la API. Revisar la rama de Neon también en el redeploy.
6. **Crear la primera cuenta.** Ejecutar `POST /auth/bootstrap` contra el entorno correspondiente con `bootstrapSecret`, `password` y el objeto `member` de un miembro activo de Presidencia, según el [DTO](../apps/backend/src/auth/dto/bootstrap-auth.dto.ts) si la base está vacía. Si ya existe un miembro válido de Presidencia sin contraseña y aún procede el bootstrap, enviar su `memberId` en lugar de `member`. Una vez configurada cualquier contraseña, el bootstrap queda cerrado para esa base.
7. **Habilitar otras cuentas.** Presidencia crea el registro desde **Miembros** y asigna la contraseña con una sesión autorizada mediante `PUT /auth/members/{id}/password` mientras la pantalla siga pendiente (H-05).

En PowerShell, usar una cadena literal entre comillas simples para evitar la expansión de `$` al preparar el cuerpo de la solicitud.

## Comprobación y registro

- Confirmar que `GET /` en la API devuelve HTTP 200 con `Hello World!`. Abrir la web, entrar a **Iniciar sesión** y comprobar que el navegador puede enviar la solicitud de inicio de sesión a la API del mismo entorno.
- Ejecutar el recorrido de CTL-03 y los diez pasos del [guion técnico](https://linear.app/id-unicode/issue/UNI2-162) con cuentas y datos de prueba. Cubrir permisos por rol, gestión de áreas, proyectos, fases, disponibilidad y cuentas inactivas.
- Registrar en comentarios de [UNI2-179](https://linear.app/id-unicode/issue/UNI2-179) las URLs desplegadas, el SHA, los resultados y las capturas revisadas para que omitan secretos, tokens y datos personales. Medir una consulta después de diez minutos sin uso y otra con la base activa.

| Síntoma observado | Qué revisar |
| --- | --- |
| Vercel rechaza el patrón `src/main.ts` de `functions`. | Publicar un commit que incluya el PR #167. El preset NestJS detecta el punto de entrada. |
| Vercel solicita permiso de escritura o el repositorio no aparece. | Confirmar el permiso Write y el acceso de la integración al repositorio. |
| El build indica `password authentication failed` o `getaddrinfo ENOTFOUND`. | Revisar que `DATABASE_URL_UNPOOLED` se haya copiado de Neon como conexión directa de la rama del entorno, sin etiquetas ni espacios agregados. |
| Redeploy sigue fallando después de corregir el archivo de configuración. | Revisar el SHA. Redeploy reutiliza el commit del despliegue seleccionado. Crear un despliegue desde el commit corregido. |
| Una edición de proyecto se queda esperando. | Confirmar `DATABASE_POOL_MAX=5` en el entorno afectado y volver a desplegar con la configuración corregida. |

## Requisitos para el uso real

1. Confirmar por separado `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, secretos y orígenes de Production y Preview. Comprobar que ninguna vista previa pueda escribir en `production`. Mantener datos ficticios en `pruebas`. Las ramas clonadas de Neon incluyen los datos de su rama padre.
2. Rotar las credenciales usadas durante la configuración inicial, actualizar ambas conexiones si cambia la contraseña de Neon y verificar una copia lógica de PostgreSQL mediante una restauración en una base desechable.
3. Revisar en Vercel el consumo del plan Hobby, compartido con otros proyectos, y verificar el flujo de builds con los autores del equipo. [Integración Git de Vercel](https://vercel.com/docs/git)
4. Revisar las evidencias de [UNI2-179](https://linear.app/id-unicode/issue/UNI2-179) y [UNI2-180](https://linear.app/id-unicode/issue/UNI2-180). Dirección autoriza el uso real y el equipo repite el guion sobre el par de URLs de producción.

## Recuperación

- **Aplicaciones.** Registrar el SHA y los despliegues compatibles de web y API. En Vercel Hobby, **Instant Rollback** permite recuperar el despliegue de Production inmediatamente anterior con las variables de aquel build. Antes de confirmar el rollback, comprobar que `DATABASE_URL` y `DATABASE_URL_UNPOOLED` del despliegue de API que se va a restaurar correspondan a la rama de Neon del entorno afectado y que el código sea compatible con su esquema actual. Si el candidato proviene del piloto y apunta a `pruebas` cuando el entorno usa `production`, o si no se puede confirmar la rama de destino, crear un despliegue desde un commit compatible con el esquema y la configuración vigentes del entorno. Si es la primera publicación, desplegar un commit corregido. Verificar la API y la web después de la recuperación. Una vez resuelta la incidencia, promover el despliegue correcto para reanudar la asignación automática del dominio. [Instant Rollback en Vercel](https://vercel.com/docs/instant-rollback)
- **Datos.** Antes de migrar, registrar rama, hora UTC y ventana efectiva de recuperación. Neon Free conserva hasta seis horas y hasta 1 GB de historial. Si una migración falla, revisar su estado y las escrituras que se perderían, y restaurar primero en una rama o base de recuperación. Verificar el esquema y el acceso antes de actualizar ambas conexiones. Conservar la copia lógica en almacenamiento protegido y probar la restauración. Un rollback de Vercel deja intacta la base. [Ventana de historial de Neon](https://neon.com/docs/postgres/backup-restore/history-window)
- **Reinicio de pruebas.** Si se ha autorizado descartar los datos de prueba, confirmar que la rama padre solo contiene datos aptos para pruebas, restablecer `pruebas` desde su padre, volver a desplegar la API y crear la primera cuenta si la base restaurada está vacía.

## Roles y seguimiento

| Rol | Responsabilidad |
| --- | --- |
| Dirección | Custodia de cuentas de Vercel y Neon, aprobación del uso real y de restauraciones. |
| Administración de GitHub | Autorizar la integración de Vercel en el repositorio y asignar los permisos requeridos. |
| Despliegue | Configurar ramas de Neon y variables, ejecutar builds y migraciones, y operar las recuperaciones. |
| Revisión y calidad | Revisar el PR, ejecutar el guion y registrar resultados en Linear. |

Las asignaciones nominales, la titularidad de cuentas, los accesos y las credenciales se gestionan de forma privada. Las evidencias de ejecución se registran en los comentarios de las tarjetas vigentes de `id-unicode`.

| Tarjeta | Seguimiento |
| --- | --- |
| [UNI2-174](https://linear.app/id-unicode/issue/UNI2-174) | Accesos e integración con GitHub. |
| [UNI2-175](https://linear.app/id-unicode/issue/UNI2-175) | Proyecto Neon y ramas. |
| [UNI2-176](https://linear.app/id-unicode/issue/UNI2-176) | Backend en Vercel, pool y CORS. |
| [UNI2-177](https://linear.app/id-unicode/issue/UNI2-177) | Migraciones por despliegue. |
| [UNI2-178](https://linear.app/id-unicode/issue/UNI2-178) | Proyectos y variables de Vercel. |
| [UNI2-181](https://linear.app/id-unicode/issue/UNI2-181) | Aislamiento de Preview. |
