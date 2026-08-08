# Registro de Deuda Técnica y Roadmap V2 — UNICORE

Este documento separa compromisos subóptimos del sistema actual (**deuda técnica**) de capacidades todavía no implementadas (**roadmap funcional**). La prioridad del roadmap no convierte una funcionalidad futura en deuda.

## Deuda técnica

Cada ítem incluye área, impacto, evidencia actual, consecuencias de no resolverla, solución propuesta y revisión sugerida.

### [TD-001] TypeORM mantiene `synchronize: true`

- **Área:** Backend / base de datos (`apps/backend/src/app.module.ts`).
- **Impacto estimado:** Alto antes de desplegar en producción.
- **Evidencia actual:** La conexión configura simultáneamente `synchronize: true` y `migrationsRun: true`.
- **Consecuencias de no resolverla:** TypeORM puede alterar el esquema fuera del historial revisado de migraciones, producir divergencias entre ambientes y elevar el riesgo de pérdida o incompatibilidad de datos.
- **Solución propuesta:** Usar `synchronize: false` fuera del desarrollo local, crear una migración por cada cambio de esquema y verificar forward/rollback en CI.
- **Revisión sugerida:** Antes del primer despliegue compartido o productivo; después, revisar en cada cambio de entidad.

### [TD-002] Cobertura semántica del contrato OpenAPI

- **Área:** Backend / documentación (`docs/endpoints.md`, controllers y DTOs).
- **Impacto estimado:** Medio.
- **Evidencia actual:** Swagger genera rutas y esquemas desde el código mediante el plugin de Nest, pero las descripciones de reglas de negocio, respuestas específicas y seguridad por operación todavía dependen de anotaciones y de esta referencia humana.
- **Consecuencias de no resolverla:** El JSON puede ser estructuralmente válido y aun así no explicar restricciones de alcance, conflictos o respuestas particulares necesarias para generar clientes y pruebas completas.
- **Solución propuesta:** Añadir gradualmente decoradores de operación, respuesta y seguridad; validar el documento generado en pruebas de contrato y usarlo para mantener la colección de API.
- **Revisión sugerida:** En cada PR que cambie un controller o DTO; exigir cobertura completa antes de generar clientes externos.

### [TD-003] Contratos TypeScript duplicados entre aplicaciones

- **Área:** Monorepo / frontend / backend.
- **Impacto estimado:** Medio.
- **Evidencia actual:** No existe un workspace compartido; el frontend declara tipos propios y el backend expone DTOs independientes.
- **Consecuencias de no resolverla:** Un cambio puede compilar en ambos workspaces y aun así romperse en ejecución por nombres o enums divergentes.
- **Solución propuesta:** Generar tipos de cliente desde OpenAPI o introducir un paquete compartido que no acople entidades persistentes al frontend.
- **Revisión sugerida:** Junto con TD-002 o cuando se agregue el siguiente módulo transversal.

### [TD-004] Controller de habilidades no registrado

- **Área:** Backend (`apps/backend/src/skills/`).
- **Impacto estimado:** Bajo/medio.
- **Evidencia actual:** Existen `SkillsController` y `SkillsService`, pero ningún `SkillsModule` está importado por `AppModule`; por ello `/skills` no se expone.
- **Consecuencias de no resolverla:** El código aparenta ofrecer un catálogo independiente de habilidades, pero consumidores y documentación no pueden usarlo; aumenta la ambigüedad de mantenimiento.
- **Solución propuesta:** Decidir si el catálogo debe ser público para usuarios autenticados. Si sí, registrar un módulo y definir RBAC/pruebas; si no, retirar el controller no alcanzable y documentar que las habilidades se administran mediante miembros.
- **Revisión sugerida:** En el próximo cambio del módulo de miembros/habilidades.

## Roadmap funcional V2

Los siguientes ítems son requisitos futuros, no defectos ni compromisos subóptimos de V1.

### Prioridad 1 — Participación (FR-48 a FR-51)

- Registrar automáticamente participación por contribución a tareas o proyectos.
- Registrar asistencia o participación manual por actividad, fecha y evento.
- Consultar y generar reportes por período y miembro.
- **Valor esperado:** disponer de evidencia de actividad para seguimiento y asignaciones.

### Prioridad 2 — Milestones, versiones y progreso ponderado (FR-45 a FR-47)

- Definir entidades `Version` / `Milestone` y asociar tareas.
- Calcular avance ponderado por prioridad (`low=1`, `medium=2`, `high=3`, `urgent=5`).
- **Valor esperado:** seguimiento de entregas y releases con una medida de avance consistente.

### Prioridad 3 — Evidencias y plantillas (FR-37, FR-42, FR-53, FR-60)

- Adjuntar evidencia por enlace o archivo y configurar si es obligatoria antes de pasar una tarea a `done`.
- Administrar plantillas reutilizables de proyectos, fases e issues por área.
- **Valor esperado:** estandarizar entregables y acelerar proyectos recurrentes.

### Prioridad 4 — Integraciones y webhooks (FR-63 a FR-69)

- Vincular tareas con ramas, commits o pull requests de GitHub/GitLab.
- Actualizar estados mediante webhooks, por ejemplo PR abierto → `in_review` y PR fusionado → `done`.
- **Valor esperado:** reducir actualizaciones manuales para equipos de software.

## Mantenimiento

- Toda nueva deuda debe recibir un identificador `TD-NNN` y completar los seis campos de la plantilla.
- Una funcionalidad pendiente permanece en Roadmap hasta que una implementación parcial genere un compromiso técnico concreto.
- Al resolver un ítem, registrar el PR/ADR correspondiente y moverlo a un historial de deuda resuelta en este mismo documento.
