# ADR-001: Selección de Stack Tecnológico y Estructura Monorepo

* **Estado**: Aceptado
* **Fecha**: 2026-08-07
* **Responsable**: Directiva ID / Equipo de Desarrollo UNICORE

---

## 💡 Contexto

UNICORE requiere centralizar la gestión de miembros, áreas, proyectos y tareas de UNICODE en una plataforma web mantenible y escalable. Se buscaba una arquitectura que permitiese compartir tipos de datos de TypeScript entre cliente y servidor, facilitando la colaboración entre desarrolladores frontend y backend sin duplicar código.

---

## 🎯 Decisión

Se acordó estructurar el proyecto como un **Monorepo** con npm workspaces utilizando el siguiente stack:

1. **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript.
2. **Backend**: NestJS 11 + TypeORM + PostgreSQL + TypeScript.
3. **Estructura de Directorios**:
   * `apps/frontend`: Aplicación cliente Next.js.
   * `apps/backend`: API REST en NestJS.
   * `docs/`: Documentación técnica centralizada.

---

## 🚀 Consecuencias

### Positivas
* **Tipado de Extremo a Extremo (End-to-End Type Safety)**: Uso de TypeScript estricto en frontend y backend.
* **Instalación Simplificada**: Una sola instrucción `npm install` instala las dependencias de todo el repositorio.
* **Separación de Responsabilidades**: Frontend y backend pueden compilarse, ejecutarse y desplegarse de manera independiente.

### Desafíos
* Requiere mantener sincronizadas las variables de entorno de ambos proyectos en desarrollo.
* La configuración de pruebas se separa entre Jest (backend) y Node Test Runner (frontend).
