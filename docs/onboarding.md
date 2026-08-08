# Guía de Onboarding para Desarrolladores — UNICORE

¡Bienvenido/a al equipo de desarrollo de **UNICORE**! Esta guía te permitirá configurar tu entorno de desarrollo y realizar tu primera contribución en menos de 15 minutos.

---

## Objetivo de UNICORE

UNICORE es el sistema centralizado de UNICODE para gestionar la estructura organizacional: áreas, miembros, proyectos, equipos, tareas mediante Kanban y trazabilidad de auditoría.

---

## Requisitos Previos en tu Equipo

Asegúrate de contar con los siguientes programas instalados:

* [Node.js v20 LTS](https://nodejs.org/) (o versión definida en `.nvmrc`)
* [Git](https://git-scm.com/)
* [PostgreSQL 15 o 16](https://www.postgresql.org/) (o Docker con la imagen oficial de postgres)
* Editor recomendado: [Visual Studio Code](https://code.visualstudio.com/)

---

## Pasos para Levantar el Proyecto desde Cero

### 1. Clonar el repositorio e instalar dependencias
```bash
git clone https://github.com/ccUnicode/UNICORE.git
cd UNICORE
npm install
```

### 2. Configurar la Base de Datos PostgreSQL
Asegúrate de que PostgreSQL esté corriendo en tu máquina y crea la base de datos `unicore`:
```sql
CREATE DATABASE unicore;
```

### 3. Configurar las Variables de Entorno del Backend
Copia el archivo `.env.example` dentro de `apps/backend`:
```bash
cp apps/backend/.env.example apps/backend/.env
```

Edita `apps/backend/.env` con tus credenciales locales:
```env
PORT=3001
DATABASE_URL=postgresql://postgres:tu_password_local@localhost:5432/unicore
DATABASE_SSL=false
AUTH_JWT_SECRET=super_secret_jwt_key_for_development_mode_only
AUTH_BOOTSTRAP_SECRET=bootstrap_secret_for_development_32_chars_min
```

### 4. Iniciar los Servidores en Desarrollo
Abre dos terminales desde la raíz del proyecto:

**Terminal 1 (Backend - NestJS)**:
```bash
npm run start:dev --workspace=apps/backend
```
*(Al iniciar, TypeORM creará automáticamente las tablas e imprimirá los logs de inicio en el puerto 3001).*

**Terminal 2 (Frontend - Next.js)**:
```bash
npm run dev --workspace=apps/frontend
```
*(El frontend iniciará en `http://localhost:3000`).*

---

## Inicialización del Usuario Administrador (Bootstrap)

La primera vez que levantes el sistema, la base de datos estará vacía. Para crear el primer usuario administrador con rol de **Presidencia**:

1. Abre tu navegador en `http://localhost:3000/login`.
2. Asegúrate de que `AUTH_BOOTSTRAP_SECRET` tenga al menos 32 caracteres y envía una petición HTTP `POST` a `http://localhost:3001/auth/bootstrap` con el body. En una base completamente vacía se debe enviar un objeto `member` que cumpla `CreateMemberDto`:
   ```json
   {
     "bootstrapSecret": "bootstrap_secret_for_development_32_chars_min",
     "password": "PasswordSeguro123!",
     "member": {
       "institution": "UNI",
       "studentCode": "20260000",
       "firstNames": "Admin",
       "lastNames": "Presidencia",
       "major": "Ingeniería de Sistemas",
       "birthDate": "2000-01-01",
       "role": "presidencia",
       "skills": ["gestión"]
     }
   }
   ```
   Si ya existe un miembro activo de Presidencia sin contraseña, reemplaza `member` por `"memberId": 1`.
3. Inicia sesión en la interfaz web con `studentCode` y la contraseña creados.

---

## Flujo de Trabajo Recomendado

1. Revisa las tareas asignadas en Linear / GitHub Issues.
2. Crea una rama desde `main` siguiendo la convención (`feat/`, `fix/`, `docs/`).
3. Ejecuta `npm run test` y `npm run type-check` antes de subir tu código.
4. Consulta `CONTRIBUTING.md` para preparar tu Pull Request.
