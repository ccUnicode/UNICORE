# Documentación técnica de UNICORE

Este directorio concentra la documentación necesaria para incorporarse al proyecto, comprender su arquitectura, desarrollar cambios, validar contratos y operar el sistema.

## Ruta recomendada por audiencia

### Nueva persona desarrolladora

1. [README del repositorio](../README.md).
2. [Guía de onboarding](onboarding.md).
3. [Guía de contribución](../CONTRIBUTING.md).
4. [Arquitectura](arquitectura.md).
5. Documento específico de frontend o backend según el área de trabajo.

### Desarrollo backend

- [Backend](backend.md): módulos, seguridad y comandos.
- [Endpoints](endpoints.md): referencia humana del contrato REST.
- [Base de datos](base-de-datos.md): entidades, relaciones y migraciones.
- [Testing](testing.md): suites, requisitos y quality gates.
- Swagger UI con el backend activo: `http://localhost:3001/api/docs`.
- OpenAPI JSON con el backend activo: `http://localhost:3001/api/docs-json`.

### Desarrollo frontend

- [Frontend](frontend.md): estructura, vistas, sesión y cliente HTTP.
- [Endpoints](endpoints.md): contratos consumidos por la interfaz.
- [Testing](testing.md): ejecución y limitaciones del conjunto frontend.
- [Colección de API](api/unicore-api.postman_collection.json): flujos de referencia para probar el backend.

### Revisión técnica

- [Guía de contribución](../CONTRIBUTING.md): ramas, commits y estructura de PR.
- [Testing](testing.md): checks requeridos y criterios antes de integrar.
- [Deuda técnica](TECH_DEBT.md): compromisos conocidos y roadmap separado.
- [ADRs](adr/): decisiones técnicas aceptadas y sus consecuencias.

### Operación

- [Runbook](runbook.md): diagnóstico, recuperación, rollback y verificación posterior.
- [Onboarding](onboarding.md): configuración local y bootstrap inicial.
- [Base de datos](base-de-datos.md): migraciones y advertencias de configuración.

## Catálogo de documentos

| Documento | Propósito | Actualizar cuando |
| :--- | :--- | :--- |
| [arquitectura.md](arquitectura.md) | Explicar componentes, flujos y seguridad general. | Cambien capas, autenticación, RBAC o flujos principales. |
| [backend.md](backend.md) | Describir módulos, estructura y convenciones del backend. | Cambien módulos, guards, servicios transversales o comandos. |
| [frontend.md](frontend.md) | Describir vistas, sesión, estado y consumo de API. | Cambien rutas, navegación, sesión o cliente HTTP. |
| [base-de-datos.md](base-de-datos.md) | Documentar entidades, relaciones y migraciones. | Cambien entidades, columnas, restricciones o migraciones. |
| [endpoints.md](endpoints.md) | Aportar contexto humano al contrato OpenAPI. | Cambien controllers, DTOs, enums, guards o respuestas. |
| [testing.md](testing.md) | Definir suites, requisitos y quality gates. | Cambien scripts, configuración, cobertura o CI. |
| [onboarding.md](onboarding.md) | Permitir levantar el proyecto desde cero. | Cambien requisitos, instalación, variables o bootstrap. |
| [runbook.md](runbook.md) | Recuperar el servicio ante fallos operativos. | Cambien despliegue, logs, migraciones o procedimientos de recuperación. |
| [TECH_DEBT.md](TECH_DEBT.md) | Registrar deuda verificable y roadmap futuro. | Se detecte, resuelva o reprograme un ítem. |
| [adr/](adr/) | Conservar decisiones técnicas importantes. | Se acepte, reemplace o descarte una decisión. |
| [api/](api/) | Mantener colecciones ejecutables de la API. | Cambie un flujo, contrato o variable usada en pruebas manuales. |

## Fuentes de verdad

| Tema | Fuente principal | Referencia humana |
| :--- | :--- | :--- |
| Rutas y esquemas REST | OpenAPI generado desde controllers y DTOs | `endpoints.md` |
| Permisos | Guards, decoradores y servicios de dominio | `backend.md`, `endpoints.md` |
| Persistencia | Entidades y migraciones TypeORM | `base-de-datos.md` |
| Comandos de validación | Scripts de `package.json` y workflows | `testing.md` |
| Configuración | `.env.example` de cada aplicación | README y onboarding |
| Decisiones técnicas | ADR aceptado más reciente | `adr/` |

Cuando una referencia humana contradiga el código o el contrato generado, corregir la documentación en el mismo PR que modifica el comportamiento.

## Convenciones

- La documentación dirigida al equipo se escribe en español.
- Los nombres de código, rutas, campos y valores de enums se conservan exactamente como aparecen en la implementación.
- Los archivos nuevos usan kebab-case, salvo convenciones reconocidas como `README.md` y `TECH_DEBT.md`.
- No se incluyen secretos, tokens, datos personales ni URLs internas sensibles.
- Los ejemplos deben ser ejecutables o identificarse expresamente como ilustrativos.
- Se evita duplicar contenido: cada documento enlaza la fuente más específica cuando necesita contexto adicional.

## Mantenimiento

La persona que modifica comportamiento, configuración o estructura debe actualizar en el mismo PR los documentos afectados. Durante la revisión se debe comprobar:

- Que los enlaces internos resuelvan dentro del repositorio.
- Que los ejemplos coincidan con los contratos actuales.
- Que las instrucciones indiquen requisitos y resultados verificables.
- Que el documento siga teniendo un propósito y una audiencia claros.
- Que la información obsoleta se actualice, se marque o se elimine.
