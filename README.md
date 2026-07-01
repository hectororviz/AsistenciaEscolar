# Asistencia Escolar

Sistema web para gestión integral de una escuela: control de accesos Dahua, asistencia de personal y alumnos, gestión de cursos, horarios, asignación de docentes, notas y más.

---

## Índice
1. [Stack tecnológico](#stack-tecnológico)
2. [Arquitectura](#arquitectura)
3. [Requisitos de red](#requisitos-de-red)
4. [Instalación y despliegue](#instalación-y-despliegue)
5. [Variables de entorno](#variables-de-entorno)
6. [Base de datos](#base-de-datos)
7. [API — Endpoints](#api--endpoints)
8. [Frontend — Páginas y roles](#frontend--páginas-y-roles)
9. [Autenticación y roles](#autenticación-y-roles)
10. [Dahua — Sincronización y webhook](#dahua--sincronización-y-webhook)
11. [Dashboard de presencia](#dashboard-de-presencia)
12. [Notas y evaluaciones](#notas-y-evaluaciones)
13. [Asistencia de alumnos](#asistencia-de-alumnos)
14. [Import/Export alumnos](#importexport-alumnos)
15. [Desarrollo local](#desarrollo-local)

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | NestJS 10 + TypeScript |
| ORM | Prisma 5 |
| Base de datos | PostgreSQL 16 |
| Frontend | React 18 + Vite 5 + TypeScript |
| Estado | React Context + TanStack React Query |
| Estilos | CSS custom properties (modo claro/oscuro) |
| Iconos | lucide-react |
| Reverse proxy | Caddy (caddy-docker-proxy) |
| Infraestructura | Docker Compose (2 servicios: db + app) |
| Excel | SheetJS (xlsx) |

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                    https://ima.mposw.com.ar (Caddy)              │
└─────────────────────────┬───────────────────────────────────────┘
                          │ reverse proxy :3000
┌─────────────────────────▼───────────────────────────────────────┐
│                    dahua-app (NestJS + React SPA)                │
│                                                                  │
│  ┌─────────────────┐     ┌──────────────────────┐               │
│  │   NestJS :3000   │────▶│   PostgreSQL :5432   │               │
│  │  API REST + SPA  │     │   (db service)        │               │
│  └────────┬─────────┘     └──────────────────────┘               │
│           │                                                      │
│  ┌────────▼─────────┐                                           │
│  │   10.20.20.3     │──── VPN ────▶ 10.10.10.100 (Dahua)       │
│  │   (vpn_net)       │                                           │
│  └──────────────────┘                                           │
└─────────────────────────────────────────────────────────────────┘
```

Dos redes Docker externas: `caddy_net` (reverse proxy) y `vpn_net` (túnel OpenVPN hacia el Dahua).

---

## Instalación y despliegue

```bash
cp .env.example .env        # Editar con credenciales reales
docker compose up -d --build
```

**Nunca usar `docker compose down -v`** en producción (borra el volumen de la DB). Para actualizar: `docker compose up -d --build`.

---

## Variables de entorno

| Variable | Descripción | Default |
|---|---|---|
| `DAHUA_HOST` | IP del Dahua | `10.10.10.100` |
| `DAHUA_USER` / `DAHUA_PASSWORD` | HTTP Digest Auth | - |
| `POSTGRES_USER/PASSWORD/DB` | Credenciales PostgreSQL | `asistencia` |
| `JWT_SECRET` | Firma de tokens JWT | - |
| `APP_NAME` / `APP_LOGO_URL` / `APP_ACCENT_COLOR` / `APP_CLUB_NAME` | Branding | - |
| `CADDY_DOMAIN` | Dominio público Caddy | - |
| `RUN_SEED` | Ejecutar seed al iniciar | `0` |

---

## Base de datos

### Tablas (20 modelos)

| Tabla | Descripción |
|---|---|
| `CicloLectivo`, `Nivel`, `Turno`, `Anio`, `Division`, `Curso` | Estructura escolar |
| `HorarioNivelTurno`, `ModuloHorario` | Horarios y módulos |
| `TipoPersonal`, `Materia`, `Persona`, `PersonaMateria` | Personal y materias |
| `Asignacion` | Docente + Materia asignados a un Curso×Módulo×Día |
| `Asistencia` | Registros entrada/salida del Dahua (`@@unique([userId, fecha])`) |
| `User` | Usuarios del sistema (ADMIN/DOCENTE, vinculado a Persona) |
| `Alumno`, `CursoAlumno` | Alumnos y su asignación a cursos |
| `Evaluacion`, `Nota`, `NotaTrimestre` | Evaluaciones, calificaciones y cierre trimestral |
| `AsistenciaAlumno` | Asistencia manual de alumnos (`@@unique([alumnoId, cursoId, fecha])`) |

---

## API — Endpoints

**Prefijo**: `/api` | **Auth**: JWT Bearer (excepto `/auth/login`, `/settings`, `/dahua/event`)

### Auth & Settings
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/login` | Login → `{ accessToken, user: { id, username, role, persona } }` |
| GET | `/settings` | Branding público |

### Estructura escolar
| Método | Ruta | Descripción |
|---|---|---|
| GET/POST/PUT/DELETE | `/ciclos-lectivos` | CRUD ciclos lectivos |
| GET/POST/PUT/DELETE | `/niveles` | CRUD niveles (con `cantidadAnios`, `duracionModuloMin`) |
| GET/POST/PUT/DELETE | `/turnos?nivelId=` | CRUD turnos |
| GET/POST/PUT/DELETE | `/anios?nivelId=&turnoId=` | CRUD años |
| GET/POST/PUT/DELETE | `/divisiones?anioId=` | CRUD divisiones |

### Cursos, Horarios, Asignaciones
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/cursos?cicloLectivoId=` | Listar cursos |
| GET | `/cursos/activo` | Cursos del ciclo activo |
| POST | `/cursos/crear` | Crear cursos en lote `{ cicloLectivoId, nivelId, turnoId, divisiones }` |
| DELETE | `/cursos/:id` | Eliminar curso |
| GET/POST/DELETE | `/cursos/:cursoId/alumnos` | Alumnos del curso (agregar en lote `{ alumnoIds: [] }`) |
| GET | `/horarios?nivelId=&turnoId=` | Horarios configurados |
| POST | `/horarios` | Crear horario |
| PUT | `/horarios/:id/modulos` | Guardar módulos |
| POST | `/horarios/:id/generar-default` | Auto-generar módulos |
| GET/PUT | `/asignaciones/curso/:cursoId` | Asignar docentes a módulos×días |

### Personal, Materias
| Método | Ruta | Descripción |
|---|---|---|
| GET/POST/PUT/DELETE | `/tipos-personal` | CRUD tipos (Docente, Administrativo, etc.) |
| GET/POST/PUT/DELETE | `/materias` | CRUD materias |
| GET | `/personas` | Lista personas |
| GET/PUT | `/personas/:id` | Ver/editar persona (incluye `horarioInicio/Fin`, `materiaIds`) |
| POST | `/personas/sincronizar` | Sync desde Dahua |

### Asistencia (personal)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/asistencia?personaId=&desde=&hasta=&page=&limit=` | Lista paginada (50 p/pág) |
| GET | `/asistencia/dashboard?fecha=` | Dashboard presencia |
| POST | `/asistencia/sincronizar` | Sync paginado (StartTime + count=500) |
| POST | `/dahua/event` | Webhook Dahua (multipart/JSON) |

### Usuarios del sistema
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/users` | Lista (incluye persona vinculada) |
| POST | `/users` | Crear `{ username, password, personaId? }` |
| PUT | `/users/:id` | Cambiar contraseña o estado |
| DELETE | `/users/:id` | Eliminar |
| GET | `/me/cursos?personaId=` | Cursos+materias de un docente |

### Alumnos
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/alumnos?search=` | Lista con búsqueda |
| GET/POST/PUT/DELETE | `/alumnos/:id` | CRUD (con `contacto1Nombre/Tel`, etc.) |

### Evaluaciones y Notas
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/evaluaciones?cursoId=&materiaId=&trimestre=` | Listar evaluaciones |
| POST | `/evaluaciones` | Crear `{ materiaId, cursoId, trimestre, nombre }` |
| PUT | `/evaluaciones/:id` | Renombrar |
| DELETE | `/evaluaciones/:id` | Eliminar |
| GET | `/notas?evaluacionId=` | Notas de una evaluación |
| POST | `/notas/batch` | Guardar notas en lote `{ evaluacionId, notas: [{ alumnoId, valor }] }` |
| GET | `/notas-trimestre?cursoId=&materiaId=` | Notas trimestrales |
| POST | `/notas-trimestre/cerrar` | Cerrar trimestre `{ materiaId, cursoId, trimestre, notas: [{ alumnoId, valor }] }` |

### Asistencia alumnos
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/asistencia-alumnos?cursoId=&mes=&anio=` | Presentes del mes |
| PUT | `/asistencia-alumnos` | Guardar `{ cursoId, registros: [{ alumnoId, fecha }] }` |

---

## Frontend — Páginas y roles

### ADMIN

```
👥 Personal
   ├── Dashboard           → /admin/dashboard
   ├── Personas            → /admin/personal/personas
   └── Asistencia          → /admin/asistencia
👤 Alumnos
   └── Alumnos             → /admin/alumnos
📚 Cursos                  → /admin/cursos
⚙️ Sistema
   └── Usuarios            → /admin/usuarios
```

### DOCENTE

```
📚 Mis Cursos              → /docente/mis-cursos
```

### Páginas principales

| Ruta | Descripción |
|---|---|
| `/admin/cursos` | **3 tabs**: Cursos (tablas por nivel), Ciclos Lectivos (CRUD + creación de cursos), Configurar (Niveles + Turnos) |
| `/admin/cursos/:id/alumnos` | Alumnos del curso: inscriptos + checkboxes para agregar |
| `/admin/cursos/:id/asignacion` | Grilla módulos × días para asignar docente+materia |
| `/admin/horarios/:nivelId/:turnoId` | Editor visual drag & drop de módulos (snap 5min) |
| `/admin/dashboard` | Timeline 06-19h: gris = horario esperado, naranja = presencia real. Dos secciones: Docentes y No Docentes |
| `/admin/personal/personas` | **2 tabs**: Personas (filtros: búsqueda, tipo, ver inactivos) + Configuración (Tipos, Materias, Sincronizar) |
| `/admin/asistencia` | Registros con filtros fecha/persona, paginación 50 p/pág, colores por día |
| `/admin/alumnos` | Lista con búsqueda, import/export XLSX, dar de baja, CRUD con 3 contactos |
| `/admin/usuarios` | Usuarios del sistema + sección "Docentes sin cuenta" (crear usuario) |
| `/docente/mis-cursos` | Cursos+materias del docente. Botones para notas y asistencia |
| `/docente/notas/:cursoId/:materiaId` | Grilla de evaluaciones × alumnos. Renombrar evaluaciones inline. Cerrar trimestre |
| `/docente/asistencia/:cursoId` | Grilla mensual: checkboxes por día + fila "Marcar todos" + navegación entre meses |

---

## Autenticación y roles

- **Login**: `POST /api/auth/login` con `{ username, password }`
- **Usuario admin**: creado por seed (`admin / 123456`)
- **Usuarios docentes**: el admin los crea desde Sistema → Usuarios → "Docentes sin cuenta"
- **JWT**: expira en 8h, incluye `role` y `personaId`
- **Role guards**: `AdminRoute` → solo ADMIN, `DocenteRoute` → solo DOCENTE
- **401**: redirección a `/login` + limpieza de localStorage

---

## Dahua — Sincronización y webhook

### Sync de personas
`POST /api/personas/sincronizar` → consulta `AccessControlCard`. Crea `Persona` con tipo `Administrativo` por defecto.

### Sync de asistencia (paginado)
```
GET /cgi-bin/recordFinder.cgi?action=find&name=AccessControlCardRec&StartTime=<ts>&count=500
```
- Paginación por `StartTime` + `count=500`. Si `found == 500`, continúa.
- Deduplica por `(userId, fecha)`.
- Recalcula Entrada/Salida por `(personaId, día)`: alterna (1°=Entrada, 2°=Salida).
- Cron automático cada 5 minutos.

### Webhook (opcional)
`POST /api/dahua/event` — recibe eventos push del Dahua (multipart/form-data o JSON). Auto-crea Persona si no existe.

---

## Dashboard de presencia

- **Dos secciones**: Docentes (horario desde `Asignacion`, módulos mergeados) y No Docentes (horario desde `Persona.horarioInicio/Fin`)
- **Timeline 06:00-19:00** con marcas cada hora
- **Bloques**: gris (horario esperado, opacity 0.12), naranja (presencia real, opacity 0.75)
- **Auto-refresh**: 5 minutos
- **Personas con horario aparecen aunque no hayan fichado**

---

## Notas y evaluaciones

- El docente crea `Evaluacion` (examen, TP, etc.) por materia+curso+trimestre
- Grilla: filas = alumnos, columnas = evaluaciones
- **Renombrar evaluaciones**: click en ícono ✏️ → input inline → Enter para guardar
- **Nota por alumno**: numérica (0-10, Decimal 4,2)
- **Cerrar trimestre**: calcula promedio sugerido de todas las evaluaciones → el docente puede ajustar → guarda `NotaTrimestre` y bloquea

---

## Asistencia de alumnos

- **Grilla mensual**: filas = alumnos, columnas = días 1-31
- **Checkbox** = presente. Fines de semana en gris, no editables. Días futuros bloqueados.
- **Fila "Marcar todos"**: ✅ por columna para activar/desactivar todos los alumnos de ese día
- **Navegación**: ← mes anterior | mes siguiente →
- **Guardar** persiste todos los cambios en lote

---

## Import/Export alumnos

- **Importar XLSX**: lee primera hoja, columnas: Apellido, Nombre, DNI, Contacto 1, Tel 1, Contacto 2, Tel 2, Contacto 3, Tel 3
- **Exportar XLSX**: descarga `alumnos.xlsx` con todas las columnas

---

## Desarrollo local

```bash
cd backend && npm install && npm run start:dev     # :3000
cd frontend && npm install && npm run dev          # :5173 (proxy /api → :3000)
```

---

## Solución de problemas

| Problema | Solución |
|---|---|
| DB vacía | No usar `docker compose down -v`. Usar `up -d --build`. |
| Sync no trae registros | Verificar VPN: `docker exec dahua-app node -e "require('http').get('http://10.10.10.100')"`. Revisar logs. |
| Dashboard pocas personas | Forzar sync: `POST /api/asistencia/sincronizar`. Sincronizar personas: `POST /api/personas/sincronizar`. |
| F5 da 404 | El backend tiene catch-all SPA (`express.get('*')` → `index.html`). |
| Error 500 en curso-alumnos | Verificar que la ruta use `:cursoId` (no `:id`). |
