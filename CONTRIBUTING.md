# Guía de Contribución a UNICORE

¡Gracias por contribuir a **UNICORE**! Para mantener la calidad del código y la cohesión en el equipo de desarrollo de UNICODE, sigue las normas descritas en esta guía, alineadas con el estándar `STD-DOC-001 v1.0`.

---

## Convención de Ramas

Las ramas deben seguir la estructura `tipo/descripcion-corta-kebab-case`:

| Tipo | Uso | Ejemplo |
| :--- | :--- | :--- |
| `feat/` | Nueva funcionalidad o mejora visual/lógica. | `feat/member-skills-filter` |
| `fix/` | Corrección de un error o bug. | `fix/login-rate-limit-message` |
| `docs/` | Cambios exclusivos en archivos de documentación. | `docs/update-endpoints-spec` |
| `refactor/` | Reestructuración de código sin alterar el comportamiento. | `refactor/area-membership-guard` |
| `test/` | Adición o corrección de pruebas automatizadas. | `test/tasks-service-unit` |
| `chore/` | Mantenimiento de dependencias, scripts o configuración. | `chore/update-eslint-config` |

---

## Convención de Commits

Seguimos la convención de [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/):

```text
tipo(alcance opcional): descripción breve en imperativo
```

Ejemplos:
* `feat(backend): add task status history endpoint`
* `fix(frontend): adjust member availability filter logic`
* `docs: apply technical documentation standard STD-DOC-001`
* `test(backend): add unit tests for audit service`

---

## Flujo de Trabajo en Git

1. **Crear una rama** a partir de `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feat/nombre-funcionalidad
   ```
2. **Desarrollar y hacer commits atómicos**: Asegúrate de que cada commit represente un cambio lógico y coherente.
3. **Verificar calidad local**:
   ```bash
   npm run type-check -w frontend
   npm run lint -w frontend
   npm run test -w frontend
   npm run build -w frontend
   npm run type-check -w backend
   npm run lint -w backend
   npm run test -w backend
   npm run build -w backend
   ```
4. **Subir la rama y abrir un Pull Request (PR)** hacia `main`.

---

## Requisitos Antes de Abrir un Pull Request

Todo PR debe estructurarse obligatoriamente con las siguientes 5 secciones ([`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md)):

1. **`Summary`**: Explicación clara de qué completa el PR y cuál es su objetivo.
2. **`Related Issue / Requirement`**: Enlace a la issue de Linear (ej. `UNI2-32`), GitHub Issue y lista de requerimientos cubiertos.
3. **`What Changed`**: Lista detallada de cambios añadidos en frontend y backend.
4. **`How to Test`**: Lista de comandos de verificación automática y checklist de verificaciones manuales.
5. **`Screenshots / Evidence`**: Reporte de resultados locales (`OK`, pasados X/X) y capturas del funcionamiento UI o terminal.

---

## Criterios para Comentarios y Documentación en Código

* **Idioma de Documentación**: La documentación en Markdown (`.md`) y los comentarios explicativos dentro de `docs/` deben escribirse en **español**.
* **Idioma de Código**: El código fuente, variables, tipos, nombres de clases/funciones y comentarios TSDoc/JSDoc deben escribirse en **inglés**.
* **Uso de TSDoc / Docstrings**:
  * **CUÁNDO USAR**: Reglas de negocio no evidentes, algoritmos de búsqueda/ordenamiento complejos o métodos con efectos secundarios.
  * **CUÁNDO NO USAR**: Métodos CRUD simples cuyos nombres y tipos de TypeScript ya expresan claramente la intención.

Ejemplo de buen uso:
```typescript
/**
 * Calculates member availability taking into account active project memberships.
 * Members marked as 'disabled' or 'not_available' cannot be assigned to new teams.
 *
 * @param memberId - Unique identifier of the member.
 * @returns Object with availability flag and reason if restricted.
 */
async checkMemberTeamEligibility(memberId: string): Promise<EligibilityResult> {
  // ...
}
```
