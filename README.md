# UNICORE — Plataforma de Gestión Organizacional UNICODE

UNICORE es la plataforma centralizada de **UNICODE** diseñada para gestionar la estructura organizacional de la comunidad: áreas, miembros con perfil de competencias y disponibilidad, proyectos, equipos, tareas mediante tableros Kanban e historial de auditoría.

---

## 🚀 Stack Tecnológico

El proyecto está construido bajo una arquitectura de **Monorepo** con npm workspaces:

* **Frontend**: [Next.js 16](https://nextjs.org/) (App Router), React 19, Vanilla CSS / TailwindCSS v4, TypeScript.
* **Backend**: [NestJS 11](https://nestjs.com/), Node.js, TypeScript.
* **Base de Datos & ORM**: PostgreSQL 16 + [TypeORM 0.3](https://typeorm.io/).
* **Autenticación & Seguridad**: JWT, Hashing `scrypt`, Rate Limiting de login (IP y cuenta), RBAC por Área y Proyecto.
* **Testing**: Jest (backend), Node.js Test Runner (frontend).

---

## 📁 Estructura del Repositorio

```text
UNICORE/
├── apps/
│   ├── backend/                  # API REST en NestJS
│   │   ├── src/                  # Módulos: auth, area, members, projects, tasks, audit, skills
│   │   ├── test/                 # Pruebas e2e y migraciones
│   │   └── .env.example          # Plantilla de variables de entorno para backend
│   └── frontend/                 # Aplicación Web en Next.js (App Router)
│       └── src/app/              # Rutas y vistas: /login, /dashboard (Personas, Proyectos, Tareas, Auditoría)
├── docs/                         # Documentación técnica centralizada (STD-DOC-001 v1.0)
│   ├── arquitectura.md           # Vista general, diagramas Mermaid y flujos
│   ├── backend.md                # Módulos NestJS, controladores y servicios
│   ├── frontend.md               # Vistas Next.js, estado y cliente de API
│   ├── base-de-datos.md          # Modelo ER, entidades, migraciones y synchronize
│   ├── endpoints.md              # Catálogo completo de endpoints de la API
│   ├── testing.md                # Comandos y criterios de pruebas
│   ├── onboarding.md             # Guía de inicio rápido para nuevos colaboradores
│   ├── TECH_DEBT.md              # Registro de deuda técnica y roadmap V2
│   ├── adr/                      # Architecture Decision Records
│   └── api/                      # Colección ejecutable de Postman/Bruno
├── CONTRIBUTING.md               # Guía de contribución, ramas, commits y PRs
└── package.json                  # Workspaces y scripts globales del proyecto
```

---

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

* **Node.js**: `v20.x` o superior (Recomendado ver `.nvmrc`).
* **npm**: `v10.x` o superior.
* **PostgreSQL**: `v15` o `v16` ejecutándose localmente o en un contenedor Docker.

---

## ⚙️ Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone https://github.com/ccUnicode/UNICORE.git
cd UNICORE
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Copia la plantilla `.env.example` en `apps/backend/.env`:
```bash
cp apps/backend/.env.example apps/backend/.env
```

Asegúrate de configurar tu conexión a PostgreSQL en `apps/backend/.env`:
```env
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/unicore
DATABASE_SSL=false
AUTH_JWT_SECRET=tu_secreto_super_seguro_de_al_menos_32_caracteres
AUTH_BOOTSTRAP_SECRET=otro_secreto_independiente_de_al_menos_32_caracteres
```

---

## 🏃‍♂️ Ejecución Local

### Ejecutar Backend y Frontend en desarrollo

Puedes iniciar los servicios desde la raíz o dentro de cada carpeta:

```bash
# Iniciar backend (Puerto 3001 por defecto)
npm run start:dev --workspace=apps/backend

# Iniciar frontend (Puerto 3000 por defecto)
npm run dev --workspace=apps/frontend
```

O desde sus respectivas carpetas:
```bash
# Backend
cd apps/backend
npm run start:dev

# Frontend (en otra terminal)
cd apps/frontend
npm run dev
```

Acceso en el navegador:
* **Frontend**: `http://localhost:3000`
* **Backend API**: `http://localhost:3001`

---

## 🛠️ Comandos Principales

Ejecuta los siguientes comandos desde la raíz del monorepo:

| Comando | Descripción |
| :--- | :--- |
| `npm run build` | Compila backend y frontend para producción. |
| `npm run test` | Ejecuta las suites de prueba unitarias e integración en todos los paquetes. |
| `npm run type-check` | Verifica la validez del sistema de tipos en TypeScript. |
| `npm run lint` | Revisa el cumplimiento de las reglas de linter (ESLint). |

---

## 📚 Documentación Técnica

Para información más detallada del sistema, consulta la carpeta [`docs/`](docs/):

* 📐 [**Arquitectura del Sistema**](docs/arquitectura.md): Diagrama general, capas y seguridad.
* ⚙️ [**Backend**](docs/backend.md): Módulos NestJS, servicios y guards.
* 🖥️ [**Frontend**](docs/frontend.md): Estructura Next.js, estados y vistas.
* 🗄️ [**Base de Datos**](docs/base-de-datos.md): Modelo ER, entidades y migraciones.
* 🔌 [**Endpoints de API**](docs/endpoints.md): Especificación de contratos REST.
* 🧪 [**Pruebas (Testing)**](docs/testing.md): Estrategia y ejecución de pruebas.
* [**Runbook operativo**](docs/runbook.md): Diagnóstico, recuperación y rollback.
* 🚀 [**Guía de Onboarding**](docs/onboarding.md): Guía paso a paso para nuevos miembros.
* 📝 [**Deuda Técnica & Roadmap V2**](docs/TECH_DEBT.md): Funcionalidades futuras y refactorizaciones.
* 📜 [**Guía de Contribución**](CONTRIBUTING.md): Flujo Git, ramas y commits.
