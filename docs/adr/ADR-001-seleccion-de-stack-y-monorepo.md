# ADR-001: Selección de Stack Tecnológico y Estructura Monorepo

* **Estado**: Aceptado
* **Fecha**: 2026-08-07
* **Responsable**: Directiva ID / Equipo de Desarrollo UNICORE

---

## Contexto

UNICORE requiere centralizar la gestión de miembros, áreas, proyectos y tareas de UNICODE en una plataforma web mantenible y escalable. Se eligió un monorepo para mantener ambas aplicaciones y su documentación en un único flujo de instalación y revisión. Actualmente frontend y backend declaran sus contratos TypeScript de forma independiente; no existe todavía un paquete de tipos compartidos.

---

## Decisión

Se acordó estructurar el proyecto como un **Monorepo** con npm workspaces utilizando el siguiente stack:

1. **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript.
2. **Backend**: NestJS 11 + TypeORM + PostgreSQL + TypeScript.
3. **Estructura de Directorios**:
   * `apps/frontend`: Aplicación cliente Next.js.
   * `apps/backend`: API REST en NestJS.
   * `docs/`: Documentación técnica centralizada.

---

## Consecuencias

### Positivas
* **Tipado local en ambas aplicaciones**: frontend y backend usan TypeScript y validan sus propios contratos.
* **Instalación Simplificada**: Una sola instrucción `npm install` instala las dependencias de todo el repositorio.
* **Separación de Responsabilidades**: Frontend y backend pueden compilarse, ejecutarse y desplegarse de manera independiente.

### Desafíos
* Requiere mantener sincronizadas las variables de entorno de ambos proyectos en desarrollo.
* La configuración de pruebas se separa entre Jest (backend) y Node Test Runner (frontend).
* Los DTOs del backend y los tipos del frontend se duplican actualmente. Crear un paquete compartido o generar tipos desde OpenAPI queda como mejora pendiente; mientras tanto, todo cambio de contrato debe actualizar y probar ambos lados.
