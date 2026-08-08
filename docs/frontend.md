# Documentación del Frontend de UNICORE

El frontend de **UNICORE** es una Single Page Application (SPA) / Web Application desarrollada con Next.js 16 (App Router), React 19 y TailwindCSS.

---

## 🛠️ Stack Frontend

* **Framework**: Next.js 16 (App Router)
* **Librería UI**: React 19
* **Estilos**: Vanilla CSS (`globals.css`) y TailwindCSS v4
* **Lenguaje**: TypeScript 5
* **Testing**: Node.js Test Runner con `tsc` (`tsconfig.test.json`)

---

## 📂 Estructura del Proyecto (`apps/frontend/src/`)

```text
src/
├── app/
│   ├── layout.tsx                    # Layout raíz de la aplicación Next.js
│   ├── page.tsx                      # Redirección automática a /login o /dashboard
│   ├── globals.css                   # Estilos globales y tokens CSS
│   ├── login/                        # Vista de Inicio de Sesión
│   │   ├── page.tsx                  # Componente de Login con formulario
│   │   └── login-validation.test.ts  # Pruebas unitarias de credenciales y rate-limit
│   ├── dashboard/                    # Vista Principal (Panel de Control)
│   │   ├── page.tsx                  # Contenedor principal de pestañas
│   │   ├── dashboard.components.tsx  # Componentes reutilizables de UI
│   │   ├── dashboard.model.ts        # Adaptadores de datos backend -> frontend
│   │   └── dashboard.types.ts        # Tipos TypeScript del dashboard
│   ├── people-management/            # Pestaña de Gestión de Personas y Áreas
│   │   ├── members.tsx               # Tabla y búsqueda de miembros
│   │   ├── member-form.tsx           # Modal de creación/edición de perfil
│   │   ├── areas.tsx                 # Gestión de áreas
│   │   ├── area-actions.tsx          # Acciones de crear/editar/archivar área
│   │   ├── membership-form.tsx       # Modal de membresía multi-área
│   │   └── profile.tsx               # Vista de perfil individual
│   ├── project-management.tsx        # Pestaña de Gestión de Proyectos y Fases
│   ├── task-management.tsx           # Pestaña de Gestión de Tareas y Tablero Kanban
│   ├── audit-management.tsx          # Pestaña de Log de Auditoría
│   └── project-experience.ts         # Cálculo helper de proyectos activos/previos
└── lib/
    └── auth-client.ts                # Cliente HTTP singleton para interactuar con la API backend
```

---

## 🖥️ Vistas Principales del Sistema

### 1. Pantalla de Login (`/login`)
* Permite el ingreso con **Código UNI** y **Contraseña**.
* Muestra mensajes descriptivos según la respuesta del backend:
  * **401**: Credenciales incorrectas.
  * **429**: Cuenta o IP bloqueada temporalmente por exceso de intentos fallidos.
  * **500 / Error de red**: Servidor no disponible.

### 2. Panel Principal (`/dashboard`)
Dispone de una barra de navegación superior con el perfil del usuario logueado y una barra lateral/pestañas condicionales según los permisos del usuario:

#### A. Gestión de Personas (`people-management/`)
* **Listado de Miembros**: Permite buscar por nombre, código UNI, carrera o filtrar por competencias, área, estado (Activo/Inactivo) y disponibilidad (Disponible, No disponible, Inhabilitado).
* **Regla de Orden**: Los miembros *Inactivos* aparecen al final del listado y los *No disponibles* se muestran con un badge restrictivo.
* **Modal de Creación/Edición**: Formulario para registrar o actualizar atributos principales y etiquetas de competencias.

#### B. Gestión de Proyectos (`project-management.tsx`)
* **Listado y Filtros**: Proyectos organizados por área, estado (*En planificación*, *Activo*, *Pausado*, *Archivado*).
* **Fases del Proyecto**: Vista para reordenar, agregar o eliminar fases del proyecto.
* **Conformación de Equipos**: Modal para agregar miembros al equipo filtrando exclusivamente por disponibilidad y habilidades requeridas.

#### C. Gestión de Tareas / Tablero Kanban (`task-management.tsx`)
* Tablero por columnas: **Por hacer (ToDo)**, **En progreso**, **En revisión**, **Hecho**.
* **Filtros**: Por proyecto, prioridad (Baja, Media, Alta, Urgente), asignado o fechas.
* **Detalle de Tarea**: Hilo interactivo para comentar y trazabilidad de quién cambió el estado y en qué fecha.

#### D. Visor de Auditoría (`audit-management.tsx`)
* Tabla que lista los eventos de auditoría registrados por el backend con fecha, hora, usuario emisor, entidad afectada y alcance.

---

## 📡 Cliente de API (`auth-client.ts`)

El frontend utiliza un cliente HTTP personalizado con soporte de autenticación:
* Incluye automáticamente el token JWT en las cabeceras (`Authorization: Bearer <token>`).
* Incluye la cabecera `x-confirm-name` para operaciones de eliminación irreversible.
* Maneja la sesión persistente en `localStorage` o memoria.

---

## 🧪 Pruebas Frontend

Las pruebas se ejecutan mediante el cliente de pruebas nativo de Node.js:

```bash
cd apps/frontend
npm run test
```

Suites probadas:
* `login-validation.test.ts`: Validación de formato de credenciales y mapeo de errores HTTP.
* `people-management-utils.test.ts`: Filtros de miembros e inactivos al final.
* `project-experience.test.ts`: Cálculo de proyectos activos vs. archivados.
* `task-collaboration.test.ts`: Inserción cronológica de comentarios sin mutar el servidor.
* `task-management.test.tsx`: Flujo de actualización Kanban e historial.
