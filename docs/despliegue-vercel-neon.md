# DES-01 · Despliegue en Vercel y Neon

**Borrador v0.3 · Actualizado según feedback · UNI2-163 (antes UNI2-76)**

Base revisada: `main`, commit `95cf697`. Este documento contiene la especificación técnica de las secciones 4 y 8 de DES-01 (procedimiento de despliegue y variables de entorno) como documentación canónica en el repositorio de GitHub. No acredita un despliegue realizado.

## Alcance y dependencias

Se proponen dos proyectos Vercel sobre `ccUnicode/UNICORE`: `unicore-web`, raíz `apps/frontend`, y `unicore-api`, raíz `apps/backend`. Neon tendrá una rama de producción y otra `pruebas`. El repositorio es público al realizar esta revisión; no hace falta cambiar su visibilidad.

Antes de publicar se deben resolver estas tarjetas en el espacio `id-unicode`:

| Tarjeta | Condición necesaria |
| --- | --- |
| [UNI2-174](https://linear.app/id-unicode/issue/UNI2-174) | Presidencia confirma cuentas, accesos, uso del plan gratuito y conexión con GitHub. |
| [UNI2-175](https://linear.app/id-unicode/issue/UNI2-175) | Proyecto Neon, ramas y conexiones por entorno disponibles. |
| [UNI2-176](https://linear.app/id-unicode/issue/UNI2-176) | Backend validado en Vercel, CORS restringido y pool configurado. |
| [UNI2-177](https://linear.app/id-unicode/issue/UNI2-177) | Migraciones ejecutadas una vez por publicación, fuera del arranque de cada instancia. |
| [UNI2-178](https://linear.app/id-unicode/issue/UNI2-178) | Proyectos y variables Vercel configurados por entorno. |
| [UNI2-181](https://linear.app/id-unicode/issue/UNI2-181) | Las vistas previas solo acceden a la rama de pruebas (aislamiento de Neon). |

Vercel reconoce actualmente aplicaciones NestJS con entrada `src/main.ts`; la ausencia de un adaptador manual no demuestra por sí sola que NestJS sea incompatible. UNI2-176 debe validar el arranque real y la reutilización de conexiones con el soporte nativo vigente. [Documentación de NestJS en Vercel](https://vercel.com/docs/frameworks/backend/nestjs).

## 4 · Variables de entorno

Esta tabla documenta nombres y finalidad, sin credenciales ni valores de configuración. Producción y Preview deben tener configuraciones independientes. Los secretos se introducen directamente en Vercel, nunca en este documento, capturas, comentarios o el repositorio.

### Variables consumidas por el código actual

| Variable | Componente | Finalidad y condición |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Frontend | URL pública del backend del mismo entorno. Next.js la incorpora al construir el frontend; un cambio requiere reconstruirlo. Si falta, el código recurre a localhost, que no sirve para el entorno publicado. |
| `NODE_ENV` | Backend | Selecciona el comportamiento de base de datos. Solo desarrollo habilita sincronización de esquema; los demás entornos usan migraciones. No activar sincronización sobre Neon. |
| `DATABASE_URL` | Backend | Conexión PostgreSQL de la rama correspondiente. Para ejecución en Vercel se prevé la conexión con pooler. Es un secreto. |
| `DATABASE_SSL` | Backend | Habilita TLS para PostgreSQL. La implementación actual no verifica el certificado del servidor; revisar este comportamiento antes de la publicación. |
| `PORT` | Backend local | Puerto del proceso NestJS al ejecutar localmente; no sustituye el enrutamiento de Vercel. |
| `AUTH_JWT_SECRET` | Backend | Firma de sesiones; obligatorio, aleatorio, con al menos 32 caracteres, distinto por entorno. |
| `AUTH_JWT_EXPIRES_IN_SECONDS` | Backend | Duración de la sesión en segundos; entero de al menos 60. |
| `AUTH_BOOTSTRAP_SECRET` | Backend | Autoriza crear la primera cuenta con contraseña; obligatorio, de al menos 32 caracteres e independiente del secreto JWT. |
| `AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS` | Backend | Ventana temporal del limitador de login. |
| `AUTH_LOGIN_RATE_LIMIT_MAX_ATTEMPTS_PER_IP` | Backend | Máximo de intentos por IP dentro de la ventana. |
| `AUTH_LOGIN_RATE_LIMIT_MAX_ATTEMPTS_PER_ACCOUNT` | Backend | Máximo de intentos por cuenta dentro de la ventana. |
| `AUTH_LOGIN_RATE_LIMIT_MAX_CONCURRENT` | Backend | Máximo de verificaciones de contraseña simultáneas por instancia. |
| `AUTH_LOGIN_RATE_LIMIT_MAX_CONCURRENT_PER_IP` | Backend | Máximo de verificaciones simultáneas por IP. |
| `AUTH_LOGIN_RATE_LIMIT_MAX_CONCURRENT_PER_ACCOUNT` | Backend | Máximo de verificaciones simultáneas por cuenta. |

Las seis variables del limitador aceptan enteros positivos y tienen valores por defecto en el código. El limitador guarda estado en memoria por instancia: sus límites no se comparten entre todas las funciones de Vercel.

Fuentes del repositorio: [plantilla backend](../apps/backend/.env.example), [configuración PostgreSQL](../apps/backend/src/database/database-options.ts), [tokens](../apps/backend/src/auth/auth-token.service.ts), [limitador](../apps/backend/src/auth/login-rate-limit.service.ts) y [cliente frontend](../apps/frontend/src/lib/auth-client.ts).

### Variables previstas, aún sin efecto en `main`

| Variable | Uso previsto | Trabajo pendiente |
| --- | --- | --- |
| `DATABASE_URL_UNPOOLED` | Conexión directa para ejecutar migraciones sobre la misma rama que usa el backend. | [UNI2-177](https://linear.app/id-unicode/issue/UNI2-177): el DataSource actual solo lee `DATABASE_URL`. |
| `DATABASE_MIGRATIONS_RUN` | Desactivar migraciones durante el arranque de las funciones. | [UNI2-177](https://linear.app/id-unicode/issue/UNI2-177): actualmente `migrationsRun` depende de `NODE_ENV`; crear esta variable en Vercel no modifica ese comportamiento. |
| `DATABASE_POOL_MAX` | Limitar las conexiones de cada instancia. | [UNI2-176](https://linear.app/id-unicode/issue/UNI2-176): pasar y validar la opción en TypeORM. |
| `CORS_ORIGIN` | Permitir el origen del frontend asociado a cada backend. | [UNI2-176](https://linear.app/id-unicode/issue/UNI2-176): `main.ts` todavía llama `enableCors()` sin leer esta variable. |

No considerar completada [UNI2-178](https://linear.app/id-unicode/issue/UNI2-178) únicamente porque estas variables existan en el panel: primero deben consumirlas y probarlas [UNI2-176](https://linear.app/id-unicode/issue/UNI2-176) y [UNI2-177](https://linear.app/id-unicode/issue/UNI2-177).

### Correspondencia de entornos

| Despliegue | Backend y base de datos | Frontend |
| --- | --- | --- |
| Production | Conexiones con pooler y directa de la rama Neon de producción. | API pública de producción. |
| Preview | Conexiones con pooler y directa de la rama Neon `pruebas`. Nunca producción. | API de prueba verificada; no la URL de producción por omisión. |
| Desarrollo local | PostgreSQL local o base desechable explícita. | API local. |

Una URL Preview cambia entre despliegues. [UNI2-181](https://linear.app/id-unicode/issue/UNI2-181) debe concretar cómo cada frontend encuentra su API de prueba y cómo esa URL entra en CORS; comprobar el par de URLs antes de ejecutar el guion. Las ramas de Neon se clonan con datos: no copiar datos personales de producción para pruebas sin un proceso de anonimización.

## 8 · Procedimiento para publicar

### Preparación del commit

1. Actualizar referencias con `git fetch origin --prune`. Trabajar en una rama desde `origin/main`, según [CONTRIBUTING](../CONTRIBUTING.md). No existe una rama remota `dev` en la revisión del 28 de octubre; no asumir otro flujo.
2. Revisar PR abiertos y sus archivos antes de crear otro cambio. Confirmar que el commit elegido contiene las correcciones necesarias; no fusionar PR solo para completar un despliegue.
3. Ejecutar desde la raíz, sobre el commit que se publicará:

   ```bash
   npm ci
   npm run type-check -w backend
   npm run lint -w backend
   npm run test -w backend -- --runInBand
   npm run build -w backend
   npm run type-check -w frontend
   npm run lint -w frontend
   npm run test -w frontend
   npm run build -w frontend
   ```

4. Validar las migraciones contra PostgreSQL desechable con `npm run test:migrations -w backend`, usando la configuración de [testing](testing.md). Registrar SHA y resultados. Nunca apuntar estas pruebas a producción.

### Configuración inicial y primera prueba

1. Presidencia coordina [UNI2-174](https://linear.app/id-unicode/issue/UNI2-174) y un administrador de `ccUnicode` concede a la aplicación GitHub de Vercel acceso al repositorio. La titularidad y accesos se coordinan de forma privada fuera del repositorio público.
2. Crear Neon según [UNI2-175](https://linear.app/id-unicode/issue/UNI2-175), con producción y `pruebas`, región compatible con la ejecución del backend y PostgreSQL 16. Obtener las dos conexiones de cada rama y guardarlas como secretos del entorno adecuado.
3. Completar [UNI2-176](https://linear.app/id-unicode/issue/UNI2-176) y [UNI2-177](https://linear.app/id-unicode/issue/UNI2-177) antes de publicar la API. Verificar que el pool se reutiliza, las migraciones no se ejecutan en cada arranque y CORS acepta solo los orígenes definidos.
4. Presidencia crea los dos proyectos Vercel con sus raíces respectivas. Seleccionar los frameworks detectados y verificar instalación desde el monorepo con el lockfile raíz. El build actual de cada aplicación es `npm run build` desde su directorio; el paso definitivo de migración y build de la API lo debe aportar [UNI2-177](https://linear.app/id-unicode/issue/UNI2-177), no un comando inventado en el panel.
5. Cargar la sección 4 en Production y Preview, conservando el aislamiento. Confirmar el tipo de entorno antes de ejecutar cualquier migración. El script actual `npm run migration:run -w backend` existe, pero usa `DATABASE_URL`; no consume automáticamente `DATABASE_URL_UNPOOLED`.
6. Publicar primero el commit seleccionado en Preview. Aunque provenga de `main`, debe apuntar a `pruebas`; verificar explícitamente entorno y rama Neon en la configuración. No tratar un push automático de `main` como una prueba aislada.
7. Verificar la API, obtener su URL de prueba y reconstruir el frontend con esa URL. Comprobar desde el navegador llamadas a la API y autorización CORS, además de la respuesta básica de `GET /`.
8. Con base de pruebas vacía, crear Presidencia mediante `POST /auth/bootstrap`, usando el secreto del entorno y el objeto `member` definido en el [DTO](../apps/backend/src/auth/dto/bootstrap-auth.dto.ts). No usar `POST /members` sin autenticar. El endpoint deja de permitir bootstrap cuando ya existe una contraseña registrada; no borrar cuentas para repetirlo.
9. Ejecutar los diez pasos del guion semanal ([UNI2-162](https://linear.app/id-unicode/issue/UNI2-162)): login, áreas, proyectos, fases, disponibilidad, cuentas inactivas, restricciones y privacidad por rol. Registrar cada resultado, URL, commit y capturas sin tokens ni datos reales en comentarios de la tarjeta en Linear ([UNI2-179](https://linear.app/id-unicode/issue/UNI2-179)). Medir una consulta tras diez minutos sin uso y otra normal, como solicita [UNI2-179](https://linear.app/id-unicode/issue/UNI2-179).
10. Presidencia y el equipo revisan resultados de [UNI2-179](https://linear.app/id-unicode/issue/UNI2-179) y [UNI2-180](https://linear.app/id-unicode/issue/UNI2-180) y deciden la publicación de producción. Repetir la validación de variables, respaldo, migraciones y guion en el entorno elegido. Una configuración Preview satisfactoria no demuestra que Production use las mismas variables ni base de datos.

El plan Hobby impone condiciones de colaboración y despliegue; probar que los commits de los autores del equipo generan previews antes de prometer una por cada PR. Mantener el flujo operativo de [UNI2-174](https://linear.app/id-unicode/issue/UNI2-174) y no alterar autoría de commits para superar restricciones. [Integración Git de Vercel](https://vercel.com/docs/git).

### Recuperación en Vercel Hobby

1. Conservar las URLs y SHA del frontend y backend de la última versión verificada, junto con el esquema compatible.
2. Si falla una publicación de producción, Presidencia abre el proyecto afectado y selecciona **Instant Rollback**. En Hobby solo está disponible el despliegue de producción inmediatamente anterior; verificar que sigue retenido y es compatible con la otra aplicación.
3. Repetir la comprobación de login, API y permisos. El rollback recupera el build y su configuración anterior: no incorpora variables modificadas después, ni revierte PostgreSQL.
4. Tras solucionar la causa, revisar y promover el despliegue correcto para reanudar la asignación automática de producción. Con dos proyectos, verificar cada uno; el rollback no es atómico entre ambos.

Si falla la primera publicación y no hay producción anterior, corregir y volver a desplegar el commit válido. No prometer un rollback inexistente. [Instant Rollback](https://vercel.com/docs/instant-rollback).

### Recuperación de datos en Neon Free

1. Antes de migrar, registrar la rama y el instante UTC de referencia; comprobar la ventana efectiva de historial. La documentación vigente indica hasta seis horas en Free, limitada a 1 GB de historial. No es una copia de seguridad de largo plazo. [Ventana de historial](https://neon.com/docs/postgres/backup-restore/history-window).
2. Conservar además una copia lógica PostgreSQL en almacenamiento protegido, fuera del repositorio, y probar su restauración en una base desechable. Asignar rol responsable y registrar la confirmación en Linear antes de producción.
3. Ante corrupción o migración incorrecta, detener las escrituras del entorno afectado y conservar evidencia. Elegir un punto anterior todavía recuperable o la copia lógica; revisar qué escrituras posteriores se perderían.
4. Restaurar primero en una rama/base de recuperación cuando sea posible y comprobar esquema, cuentas y datos antes de sustituir la conexión del servicio. Si no existe capacidad gratuita para esa rama, Presidencia debe decidir el procedimiento disponible sin activar una ampliación de pago automáticamente.
5. Actualizar de forma coordinada las conexiones con pooler y directa hacia la base recuperada y publicar un backend compatible. Ejecutar el guion de humo y registrar el punto recuperado y la posible pérdida de datos en Linear.

Volver al código anterior no deshace una migración. No ejecutar un `down()` sin probarlo ni reiniciar automáticamente una función que pueda reaplicar la migración defectuosa. Fuera de la ventana recuperable, la alternativa es la copia lógica probada.

## 9 · Roles y accesos

Para mantener la seguridad del proyecto, la asignación nominal de personas, credenciales y titularidad de cuentas se gestiona de forma privada fuera del repositorio público. El procedimiento técnico se rige por los siguientes roles:

| Rol | Recurso | Responsabilidad y alcance técnico |
| --- | --- | --- |
| Presidencia / Dirección | Vercel Hobby & Neon Free | Titularidad de cuentas en la nube; conexión con GitHub, carga de secretos y variables de entorno, autorización de despliegues a producción y ejecución de rollback. |
| Administrador de `ccUnicode` | Organización GitHub | Instala o autoriza la app de Vercel para UNICORE; gestiona permisos de ramas y colaboradores. |
| Desarrolladores / Despliegue | Proyecto Neon `unicore` & GitHub | Creación de rama `pruebas`, verificación de migraciones, validación de endpoints y ejecución técnica del despliegue en entornos de prueba. |
| Revisores de código | Repositorio GitHub | Revisión técnica de Pull Requests, verificación de CI/checks automatizados y validación de guiones de integración. |

> **Nota sobre evidencias y seguimiento:** El seguimiento operativo, resultados de ejecución, enlaces de despliegue, capturas de pantalla y confirmación de accesos se documentan exclusivamente en comentarios de las issues vigentes en el espacio `id-unicode` de Linear. Ningún secreto, token o credencial debe incluirse en la documentación ni en el repositorio.
