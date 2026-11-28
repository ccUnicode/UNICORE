# Despliegue del backend

La [guía DES-01 de despliegue en Vercel y Neon](despliegue-vercel-neon.md)
describe la configuración, los entornos y las comprobaciones de la API y la web.

Para comprobar que las migraciones se pueden ejecutar de nuevo, configurar una
base PostgreSQL desechable con las variables indicadas en DES-01 y ejecutar
desde `apps/backend`:

```sh
npm run build:vercel
npm run migration:deploy
```

La segunda ejecución debe indicar que no hay migraciones pendientes.
