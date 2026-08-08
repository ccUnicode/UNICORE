# Runbook operativo de UNICORE

Este documento reúne procedimientos para diagnosticar y recuperar UNICORE ante fallos frecuentes. Está dirigido a quienes ejecutan el proyecto en desarrollo o administran un ambiente compartido.

## Alcance y responsables

- El backend está en `apps/backend` y escucha en `PORT` (`3001` por defecto).
- El frontend está en `apps/frontend` y usa `NEXT_PUBLIC_API_URL` para localizar la API.
- PostgreSQL es el almacenamiento persistente del sistema.
- La persona responsable del ambiente debe conservar acceso a los logs, la configuración y las copias de seguridad.
- Los incidentes que puedan afectar datos, secretos o autenticación deben escalarse al líder técnico antes de ejecutar cambios manuales en la base de datos.

## Verificación inicial

Ejecutar estas comprobaciones antes de modificar el ambiente:

1. Confirmar que PostgreSQL responde y que `DATABASE_URL` apunta al servidor esperado.
2. Confirmar que `AUTH_JWT_SECRET` y `AUTH_BOOTSTRAP_SECRET` existen, son diferentes y tienen al menos 32 caracteres.
3. Consultar el health check del backend:

   ```bash
   curl http://localhost:3001/
   ```

4. Confirmar que el frontend usa la URL correcta:

   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

5. Revisar los logs antes de reiniciar para conservar la causa original del fallo.

## Logs

En desarrollo, NestJS y Next.js escriben sus logs en la terminal que ejecuta cada proceso. En un ambiente administrado, la plataforma de despliegue debe centralizar la salida estándar y la salida de error.

Registrar como mínimo:

- Fecha, hora y ambiente.
- Commit o versión desplegada.
- Servicio afectado.
- Mensaje de error completo, sin copiar secretos ni tokens.
- Petición o flujo que produjo el error.
- Acción de recuperación aplicada.

## Reinicio de servicios

### Desarrollo local

Detener el proceso con `Ctrl+C` y volver a iniciarlo desde la raíz:

```bash
npm run start:dev --workspace=apps/backend
npm run dev --workspace=apps/frontend
```

Reiniciar PostgreSQL mediante la herramienta con la que fue instalado o mediante el contenedor correspondiente. No eliminar volúmenes como parte de un reinicio ordinario.

### Ambiente compartido

Usar el mecanismo de reinicio de la plataforma. Antes de reiniciar:

1. Guardar los logs relevantes.
2. Verificar que no haya una migración en ejecución.
3. Confirmar que las variables del servicio no cambiarán durante el reinicio.
4. Ejecutar las comprobaciones posteriores descritas en este documento.

## Problemas frecuentes

### El backend no inicia por configuración de autenticación

Síntoma: aparece un error indicando que `AUTH_JWT_SECRET` o `AUTH_BOOTSTRAP_SECRET` debe tener al menos 32 caracteres.

Acciones:

1. Definir ambos secretos con valores independientes.
2. No reutilizar ejemplos del repositorio en ambientes compartidos.
3. Reiniciar el backend.
4. Verificar `GET /` y un login válido.

### PostgreSQL rechaza la conexión

Síntoma: `ECONNREFUSED`, autenticación fallida o base de datos inexistente.

Acciones:

1. Verificar que PostgreSQL esté activo.
2. Revisar host, puerto, usuario, contraseña y base en `DATABASE_URL`.
3. Confirmar que el usuario tenga acceso a la base indicada.
4. Probar la conexión con un cliente PostgreSQL antes de reiniciar UNICORE.

### Una migración falla al iniciar

El backend ejecuta las migraciones registradas mediante `migrationsRun: true`. También mantiene `synchronize: true`; esta combinación está registrada como deuda técnica y no debe usarse en producción sin revisión.

Acciones:

1. Conservar el error SQL y el nombre de la migración.
2. Detener nuevos intentos automáticos si el error puede modificar datos repetidamente.
3. Ejecutar la validación de migraciones en un ambiente desechable:

   ```bash
   npm run test:migrations --workspace=apps/backend
   ```

4. Comparar el esquema con la versión anterior y revisar el método `down` de la migración.
5. Restaurar una copia de seguridad si hubo una modificación parcial no recuperable.
6. No editar manualmente la tabla de migraciones sin aprobación del responsable técnico.

### El login devuelve `401`

Acciones:

1. Confirmar que se usa `studentCode`, no un nombre de campo antiguo.
2. Verificar que el miembro esté activo y no tenga disponibilidad `disabled`.
3. Confirmar que la contraseña pertenece al ambiente actual.
4. Considerar que un cambio de contraseña incrementa `sessionVersion` e invalida tokens anteriores.

### El login devuelve `429`

El rate limiter controla intentos por IP, cuenta y concurrencia dentro de cada instancia del backend.

Acciones:

1. Detener los reintentos automáticos.
2. Esperar la ventana configurada antes de volver a probar.
3. Revisar las variables `AUTH_LOGIN_RATE_LIMIT_*`.
4. Investigar la fuente de los intentos antes de aumentar límites.

### El frontend no puede consumir la API

Acciones:

1. Verificar `NEXT_PUBLIC_API_URL` y el puerto del backend.
2. Confirmar que `GET /` responde desde el navegador o equipo afectado.
3. Revisar la consola del navegador y la respuesta HTTP.
4. Eliminar únicamente el token de `sessionStorage` si la sesión quedó inválida; no borrar otros datos del navegador sin necesidad.

## Rollback

Antes de desplegar, conservar el commit anterior y una copia de seguridad compatible de PostgreSQL.

Si el despliegue falla:

1. Detener el tráfico o las escrituras si existe riesgo de corrupción.
2. Guardar logs y estado de las migraciones.
3. Volver al artefacto o commit anterior mediante la plataforma de despliegue.
4. Si el esquema cambió, ejecutar el rollback probado de la migración o restaurar la copia de seguridad. No asumir que revertir el código revierte la base de datos.
5. Reiniciar los servicios y completar el checklist posterior.

## Verificación posterior

- `GET /` responde correctamente.
- Un usuario válido puede iniciar sesión y consultar `GET /auth/me`.
- Las áreas y los proyectos accesibles cargan según el rol.
- Se puede consultar una lista de tareas con un `projectId` válido.
- No aparecen errores nuevos de conexión o migración en los logs.
- El frontend carga y apunta al backend del mismo ambiente.

## Registro del incidente

Después de recuperar el servicio, documentar:

- Causa raíz confirmada o hipótesis pendiente.
- Impacto y duración.
- Acciones ejecutadas.
- Validaciones posteriores.
- Trabajo preventivo, issue o deuda técnica relacionada.
