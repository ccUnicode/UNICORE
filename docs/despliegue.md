# Despliegue del backend

## Vercel

| Configuración | Valor |
| --- | --- |
| Root Directory | `apps/backend` |
| Framework Preset | NestJS |
| Node.js | 22.x |
| Build Command | `npm run build:vercel` |
| Output Directory | Predeterminado |
| Duración máxima | 60 segundos |

Habilitar el acceso a archivos fuera del directorio raíz para los workspaces y
el lockfile. Instalar con `npm ci` desde la raíz del repositorio.

Vercel usa `src/main.ts` como [entrada de NestJS](https://vercel.com/docs/frameworks/backend/nestjs).
Las rutas mantienen sus nombres, por ejemplo `/auth/login` y `/areas`.

## Variables

Además de las variables de autenticación de `.env.example`:

| Variable | Valor en Vercel |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Conexión con pooler |
| `DATABASE_URL_UNPOOLED` | Conexión directa para migraciones |
| `DATABASE_SSL` | `true` |
| `DATABASE_MIGRATIONS_RUN` | `false` |
| `DATABASE_POOL_MAX` | `1` o `2` |
| `CORS_ORIGIN` | Origen del frontend, con protocolo y sin barra final |

Configurar Production con la rama `main` de Neon y Preview con `pruebas`.
Ambas conexiones de cada entorno deben apuntar a la misma rama.
`CORS_ORIGIN` admite un origen por entorno.

En local, omitir las cuatro variables nuevas conserva la configuración anterior.

## Migraciones

`build:vercel` compila y ejecuta `migration:deploy`. Este último exige
`DATABASE_URL_UNPOOLED` y desactiva la sincronización del esquema.
Si una migración falla, la construcción termina con error.

Para comprobarlo en una base de pruebas, desde `apps/backend`:

```sh
npm run build:vercel
npm run migration:deploy
```

La segunda ejecución debe indicar que no hay migraciones pendientes.
En el entorno publicado, comprobar también que los datos creados en Preview
aparezcan únicamente en la rama `pruebas` de Neon.
