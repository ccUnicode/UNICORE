# Colección de API de UNICORE

`unicore-api.postman_collection.json` contiene un flujo manual automatizado para validar contratos principales del backend.

## Requisitos

- Backend activo en el valor configurado como `baseUrl`.
- PostgreSQL desechable o ambiente local sin datos importantes.
- `bootstrapSecret` igual a `AUTH_BOOTSTRAP_SECRET`.
- Base sin cuentas configuradas para ejecutar Bootstrap; si ya existe el administrador, ejecutar desde Login.

La colección crea áreas, miembros, proyectos, membresías y tareas. No debe ejecutarse contra producción.

## Importación

1. Importar el archivo en Postman o una herramienta compatible con Postman Collection v2.1.
2. Revisar las variables de colección.
3. Cambiar códigos de estudiante y nombres si el ambiente ya contiene los valores de ejemplo.
4. Ejecutar las carpetas en orden numérico.

## Flujo

1. Bootstrap acepta `201` en una base vacía o `409` cuando la autenticación ya fue configurada.
2. Login guarda `accessToken` y el ID del administrador.
3. Se comprueba el perfil y el rechazo de una petición sin token.
4. Se crea un área y se guarda `areaId`.
5. Se crea un miembro del área y se guarda `memberId`.
6. Se comprueba un body inválido con respuesta `400`.
7. Se crea un proyecto, se guarda `projectId` y se toma su primera `phaseId`.
8. Se agrega el miembro al proyecto y se crea una tarea asignada.
9. Se valida la respuesta paginada de tareas y el rechazo sin `projectId`.
10. Se consulta la auditoría generada por el flujo.

## Variables

| Variable | Uso |
| :--- | :--- |
| `baseUrl` | URL del backend. |
| `bootstrapSecret` | Secreto local de bootstrap; no guardar valores compartidos o productivos. |
| `adminStudentCode`, `adminPassword` | Credenciales del administrador de prueba. |
| `memberStudentCode` | Código único del miembro creado por la colección. |
| `areaName`, `projectName` | Nombres que deben ser únicos en el ambiente. |
| `accessToken` | Se completa después del login. |
| `areaId`, `memberId`, `projectId`, `phaseId`, `taskId` | Se completan al avanzar por el flujo. |

## Resultado esperado

Cada petición contiene assertions de código HTTP y, en respuestas principales, de estructura. Una ejecución es satisfactoria cuando no falla ninguna assertion y los IDs encadenados quedan definidos.

Si una ejecución parcial dejó datos creados, usar valores únicos nuevos o restaurar la base desechable antes de repetirla.

## Mantenimiento

Actualizar la colección y este documento cuando cambien rutas, DTOs, enums, autenticación o reglas necesarias para encadenar el flujo. La especificación en `/api/docs-json` es la fuente técnica principal; esta colección añade escenarios y datos concretos de validación.
