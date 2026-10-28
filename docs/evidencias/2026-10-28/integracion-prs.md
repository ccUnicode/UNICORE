# Auditoría local de integración — 28 de octubre de 2026

Esta evidencia corresponde a una combinación **local, no publicada ni fusionada en main**. No sustituye la prueba de humo sobre main después de las fusiones reales.

## Referencias verificadas

- Base: `main` / `origin/main` en `95cf6976bf21245e8f2619e76bb3a5274f8fbdaf`.
- PR #103: `6e7c5737069da6a8f693ea80c5b2ee1f8d3c9014`.
- PR #108 corregido e integrado con main: `aad9c19ca4a9e75293d20e39b37fe8f8a26dc60c`.
- PR #109 corregido e integrado con main: `2bac09d23396b07ed0a3aac51498c064e4b1977c`.
- PR #132: `c163c9e819e275ac9ef08fd65e8d1da6d242be43`.
- Rama local de auditoría: `feat/uni2-75-integration-audit`.
- Commit final local: `e82c9fb`.
- No existe referencia remota `origin/dev`.

## Orden y compatibilidad

Se fusionaron localmente en este orden: **#103 → #108 → #109 → #132**, partiendo de main. Los cuatro merges terminaron sin conflictos textuales. #132 solo elimina un mensaje de login obsoleto y puede integrarse independientemente.

#103 y #108 modifican `projects.service.ts` y su suite; Git resolvió las zonas distintas sin conflicto y las pruebas mantienen tanto la incorporación de miembros no disponibles al proyecto como la asignación a tareas. #108 preserva responsables inhabilitados existentes, rechaza nuevos y limita `availabilityStatus` a Presidencia/Directiva en la respuesta del proyecto. #109 registra la migración con número `1787788800009` en `database-options.ts` y las fases iniciales en español.

No se encontraron conflictos funcionales adicionales con las verificaciones ejecutadas. No se incluye PR #56, cuya documentación requiere tratamiento separado.

## Validación

| Comprobación | Resultado |
| --- | --- |
| Backend unitario | 338/338; 43 suites |
| Frontend | 61/61 |
| Type-check backend y frontend | OK |
| Lint backend y frontend | OK |
| Build backend y frontend | OK |
| Integración PostgreSQL / migraciones | 8/8; 3 suites |
| `git diff --check 95cf697...HEAD` | OK |

Las pruebas de migración corrieron contra el PostgreSQL local de QA aislado en `127.0.0.1:55432`, creando y eliminando sus propias bases/esquemas. Cubren arranque con migraciones, bootstrap de Presidencia, persistencia de asignaciones de área, actualización de instalación existente, colaboración y traducción reversible de fases sin alterar personalizaciones. El contenedor QA quedó en ejecución para el trabajo del agente principal.

El mensaje de consola sobre esquema incompleto `project_links` corresponde al escenario negativo esperado; la suite terminó correcta.

Durante la preparación del worktree, Turbopack rechazó un `node_modules` enlazado fuera de su raíz. También se observó un 500 artificial en lugar de ConflictException con dependencias NestJS cargadas desde dos árboles por enlaces. Ambos desaparecieron al copiar las dependencias dentro del worktree, sin cambiar código ni configuración del proyecto.

## Documentación y solapamientos

- #103 modifica `docs/frontend.md`.
- #109 modifica `docs/backend.md`, `docs/base-de-datos.md` y `docs/endpoints.md`.
- Ninguno de estos PR modifica `docs/testing.md` ni crea una guía de despliegue.
- La actualización de `docs/testing.md` y la nueva guía preparada por el agente principal no presentan solapamiento textual con estos cambios.

## Límites y siguiente paso

La combinación es una auditoría previa a fusión. Antes de actualizar o integrar PRs, comprobar que sus heads siguen coincidiendo con las referencias anteriores. Después de las fusiones reales, actualizar main y ejecutar el guion de humo en navegador para cerrar UNI2-75. Los tests automáticos anteriores no certifican por sí solos ese flujo manual.
