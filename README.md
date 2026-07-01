# Asistencia Escolar

Sistema web para gestión de control de accesos y asistencia escolar. Se integra con dispositivos Dahua (ASI3214A-W) para obtener registros de entrada/salida de personal, gestionar cursos, horarios y asignación de docentes.

---

## Índice
1. [Stack tecnológico](#stack-tecnológico)
2. [Arquitectura](#arquitectura)
3. [Requisitos de red](#requisitos-de-red)
4. [Instalación y despliegue](#instalación-y-despliegue)
5. [Variables de entorno](#variables-de-entorno)
6. [Base de datos — Modelo de datos](#base-de-datos--modelo-de-datos)
7. [API — Endpoints](#api--endpoints)
8. [Frontend — Estructura y páginas](#frontend--estructura-y-páginas)
9. [Autenticación](#autenticación)
10. [Flujo de sincronización con Dahua](#flujo-de-sincronización-con-dahua)
11. [Webhook de eventos (push)](#webhook-de-eventos-push)
12. [Dashboard de presencia](#dashboard-de-presencia)
13. [Desarrollo local](#desarrollo-local)
14. [Solución de problemas](#solución-de-problemas)

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

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         Internet / Caddy                         │
│                   https://ima.mposw.com.ar                       │
└─────────────────────────┬───────────────────────────────────────┘
                          │ reverse proxy :3000
┌─────────────────────────▼───────────────────────────────────────┐
│                    dahua-app (NestJS + React)                    │
│                                                                  │
│  ┌─────────────────┐     ┌──────────────────────┐               │
│  │   NestJS :3000   │────▶│   PostgreSQL :5432   │               │
│  │  API + SPA       │     │   (db service)        │               │
│  └────────┬─────────┘     └──────────────────────┘               │
│           │                                                      │
│  ┌────────▼─────────┐                                           │
│  │   10.20.20.3     │──── VPN ────▶ 10.10.10.100 (Dahua)       │
│  │   (vpn_net)       │                                           │
│  └──────────────────┘                                           │
└─────────────────────────────────────────────────────────────────┘
```

**Dos redes Docker externas:**
- `caddy_net` — comunicación con Caddy reverse proxy
- `vpn_net` — túnel OpenVPN hacia el Dahua (10.20.20.0/24)

**Ruta estática al iniciar** (`docker-entrypoint.sh`):
```bash
ip route add 10.10.10.0/24 via 10.20.20.2 dev <interfaz_vpn_net>
```

---

## Requisitos de red

- **Red externa `caddy_net`**: creada por caddy-docker-proxy
- **Red externa `vpn_net`**: creada por el contenedor openvpn-server
- **IP del Dahua**: `10.10.10.100:80`
- **CAP_NET_ADMIN**: requerido para agregar la ruta estática

---

## Instalación y despliegue

```bash
# 1. Clonar repositorio
git clone <repo-url> asistenciaEscolar && cd asistenciaEscolar

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con credenciales reales

# 3. Construir e iniciar
docker compose up -d --build

# 4. Verificar
docker compose ps
docker logs dahua-app
```

**IMPORTANTE**: Nunca usar `docker compose down -v` en producción (borra la base de datos). Para actualizar:

```bash
docker compose up -d --build
```

---

## Variables de entorno

### `.env`

| Variable | Descripción | Default |
|---|---|---|
| `DAHUA_HOST` | IP del dispositivo Dahua | `10.10.10.100` |
| `DAHUA_USER` | Usuario HTTP Digest Auth del Dahua | `admin` |
| `DAHUA_PASSWORD` | Contraseña del Dahua | (obligatorio) |
| `POSTGRES_USER` | Usuario PostgreSQL | `asistencia` |
| `POSTGRES_PASSWORD` | Contraseña PostgreSQL | `asistencia123` |
| `POSTGRES_DB` | Nombre base de datos | `asistencia` |
| `DATABASE_URL` | URL conexión Prisma | `postgresql://asistencia:asistencia123@db:5432/asistencia` |
| `JWT_SECRET` | Secreto para tokens JWT | `asistencia-escolar-secret` |
| `APP_NAME` | Nombre de la app (login/sidebar) | `Asistencia Escolar` |
| `APP_LOGO_URL` | URL del logo | (vacío → iniciales) |
| `APP_ACCENT_COLOR` | Color accent | `#f59e0b` |
| `APP_CLUB_NAME` | Nombre del colegio | (vacío) |
| `CADDY_DOMAIN` | Dominio público | `dahua-dev.tudominio.com` |
| `RUN_SEED` | Ejecutar seed al iniciar (`0`/`1`) | `0` |
| `PORT` | Puerto de la app | `3000` |

---

## Base de datos — Modelo de datos

### Diagrama entidad-relación

```
CicloLectivo
  └── Curso ──── Nivel ──── Turno
       │           │           └── HorarioNivelTurno ─── ModuloHorario
       │           │
       │           └── Anio ── Division
       │
       └── Asignacion ─── ModuloHorario
              │                │
              ├── Materia      │
              └── Persona      │
                   │           │
                   ├── TipoPersonal
                   ├── PersonaMateria
                   └── Asistencia
```

### Tablas principales

| Tabla | Descripción |
|---|---|
| `CicloLectivo` | Año escolar (ej: 2026). Uno activo a la vez. |
| `Nivel` | Inicial, Primaria, Secundaria. Define `duracionModuloMin` y `cantidadAnios`. |
| `Turno` | Mañana, Tarde. Pertenece a un Nivel. Define `horaInicio` / `horaFin`. |
| `Anio` | 1°, 2°, ... Pertenece a Nivel + Turno. |
| `Division` | A, B, Rosa, ... Pertenece a un Año. |
| `Curso` | Entidad completa: CicloLectivo + Nivel + Turno + Año + División. Ej: "Primaria: 3° B Mañana (2026)". |
| `HorarioNivelTurno` | Configuración de módulos para un Nivel+Turno (compartido entre cursos). |
| `ModuloHorario` | Bloque horario: orden, horaInicio, horaFin, duración. |
| `TipoPersonal` | Docente, Directivo, Auxiliar, Administrativo. |
| `Materia` | Materia escolar (Matemática, Lengua, etc.). |
| `Persona` | Personal importado del Dahua. Vinculado por `userId`. |
| `PersonaMateria` | Materias que dicta un docente. |
| `Asignacion` | Materia + Docente asignados a un Curso en un Módulo+Día. |
| `Asistencia` | Registros de entrada/salida del Dahua. `@@unique([userId, fecha])`. |

---

## API — Endpoints

**Prefijo global**: `/api`

**Autenticación**: JWT Bearer token (excepto `/auth/login`, `/settings`, `/dahua/event`).

### Auth
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/auth/login` | No | Login `{ username, password }` → `{ accessToken, user }` |

### Settings
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/settings` | No | Config de branding: `appName, logoUrl, accentColor` |

### Ciclos Lectivos
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/ciclos-lectivos` | Lista (orden año desc) |
| GET | `/ciclos-lectivos/:id` | Uno por ID |
| POST | `/ciclos-lectivos` | Crear `{ anio, nombre?, fechaInicio, fechaFin }` |
| PUT | `/ciclos-lectivos/:id` | Actualizar |
| DELETE | `/ciclos-lectivos/:id` | Eliminar |

### Niveles
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/niveles` | Lista |
| POST | `/niveles` | Crear `{ nombre, duracionModuloMin?, cantidadAnios? }` |
| PUT | `/niveles/:id` | Actualizar |
| DELETE | `/niveles/:id` | Eliminar |

### Turnos
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/turnos?nivelId=` | Lista (filtrable por nivel) |
| POST | `/turnos` | Crear `{ nombre, horaInicio, horaFin, nivelId }` |
| PUT | `/turnos/:id` | Actualizar |
| DELETE | `/turnos/:id` | Eliminar |

### Años
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/anios?nivelId=&turnoId=` | Lista (filtrable) |
| POST | `/anios` | Crear `{ nombre, orden, nivelId, turnoId }` |
| PUT | `/anios/:id` | Actualizar |
| DELETE | `/anios/:id` | Eliminar |

### Divisiones
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/divisiones?anioId=` | Lista (filtrable) |
| POST | `/divisiones` | Crear `{ nombre, anioId }` |
| PUT | `/divisiones/:id` | Actualizar |
| DELETE | `/divisiones/:id` | Eliminar |

### Cursos
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/cursos?cicloLectivoId=` | Lista por ciclo |
| GET | `/cursos/activo` | Cursos del ciclo activo |
| POST | `/cursos/crear` | Crear en lote `{ cicloLectivoId, nivelId, turnoId, divisiones }` |
| DELETE | `/cursos/:id` | Eliminar |

### Horarios
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/horarios?nivelId=&turnoId=` | Lista de horarios configurados |
| POST | `/horarios` | Crear horario para nivel+turno `{ nivelId, turnoId }` |
| PUT | `/horarios/:id/modulos` | Reemplazar módulos del horario |
| POST | `/horarios/:id/generar-default` | Auto-generar módulos según `duracionModuloMin` |

### Materias
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/materias` | Lista |
| POST | `/materias` | Crear `{ nombre }` |
| PUT | `/materias/:id` | Actualizar |
| DELETE | `/materias/:id` | Eliminar |

### Tipos de Personal
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/tipos-personal` | Lista |
| POST | `/tipos-personal` | Crear `{ nombre }` |
| PUT | `/tipos-personal/:id` | Actualizar |
| DELETE | `/tipos-personal/:id` | Eliminar |

### Personas
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/personas` | Lista (incluye tipo y materias) |
| GET | `/personas/:id` | Una persona |
| PUT | `/personas/:id` | Actualizar `{ habilitado, fechaNacimiento, dni, direccion, telefono, email, notas, tipoPersonalId, materiaIds }` |
| POST | `/personas/sincronizar` | Sincronizar desde Dahua (crea personas nuevas) |

### Asignaciones (docentes x curso)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/asignaciones/curso/:cursoId` | Datos de asignación: curso, módulos, materias, docentes, ocupación |
| PUT | `/asignaciones/curso/:cursoId` | Guardar `{ asignaciones: [...] }` |

### Asistencia
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/asistencia?personaId=&desde=&hasta=&page=&limit=` | Lista paginada (50 por página) |
| GET | `/asistencia/dashboard?fecha=` | Dashboard de presencia para una fecha |
| POST | `/asistencia/sincronizar` | Sync manual desde Dahua (paginado por `StartTime`) |

### Dahua Webhook
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/dahua/event` | No | Recibe eventos push del Dahua (multipart/form-data o JSON) |

---

## Frontend — Estructura y páginas

### Sidebar
```
👥 Personal
   ├── Dashboard           → /admin/dashboard
   ├── Personas            → /admin/personal/personas
   └── Asistencia          → /admin/asistencia
📚 Cursos                  → /admin/cursos
⚙️ Sistema
   └── Usuarios            → /admin/usuarios
```

### Páginas

| Ruta | Componente | Descripción |
|---|---|---|
| `/login` | `LoginPage` | Login con logo configurable |
| `/admin/cursos` | `CursosPage` | **3 tabs**: Cursos, Ciclos Lectivos, Configurar |
| `/admin/cursos/:id/asignacion` | `AsignacionPage` | Grilla módulos × días para asignar docentes |
| `/admin/horarios/:nivelId/:turnoId` | `HorarioEditorPage` | Editor visual de horarios (drag & drop) |
| `/admin/dashboard` | `DashboardPage` | Presencia en tiempo real: timeline 06:00-19:00 |
| `/admin/personal/personas` | `PersonalPage` | **2 tabs**: Personas, Configuración |
| `/admin/asistencia` | `AsistenciaPage` | Registros con filtros fecha/persona y paginación |
| `/admin/usuarios` | `SystemUsersPage` | Usuarios del sistema |

### Pestañas de CursosPage

| Tab | Descripción |
|---|---|
| **Cursos** | Tablas agrupadas por Nivel con bloques de colores pastel. Cada fila muestra Año, División, Turno. Botón 📋 para asignar docentes. |
| **Ciclos Lectivos** | CRUD de ciclos. Botón 👁️ para ver detalle con cursos. Modal de creación carga Nivel+Turno y genera cursos con años (1° a N°) + divisiones configurables. |
| **Configurar** | ABM de Niveles (con `cantidadAnios` y `duracionModuloMin`) y Turnos (con 🕐 para editar horarios). |

### Pestañas de PersonalPage

| Tab | Descripción |
|---|---|
| **Personas** | Tabla: #, ID, Nombre, Tipo, Estado. Acciones: 👁️ ver, ✏️ editar, 📊 asistencia. |
| **Configuración** | ABM Tipos de Personal + ABM Materias + botón "Sincronizar con Dahua". |

### Editor visual de horarios

- Timeline de `horaInicio` a `horaFin` del turno
- Bloques arrastrables (mover) y redimensionables (bordes) con snap a 5 minutos
- Los espacios entre módulos son recreos (se muestran en texto gris)
- Botón "Auto-generar": crea módulos según `duracionModuloMin` del nivel
- Botón "Guardar" → feedback ✓ y redirección

---

## Autenticación

- **Login**: `POST /api/auth/login` con `{ username: "admin", password: "123456" }`
- **JWT**: expira en 8 horas
- **Frontend**: token almacenado en `localStorage.authToken`. Axios interceptor agrega `Authorization: Bearer <token>` automáticamente.
- **401**: redirección a `/login` + limpieza de localStorage

---

## Flujo de sincronización con Dahua

### 1. Personas

`POST /api/personas/sincronizar` consulta `AccessControlCard` del Dahua:

```
GET /cgi-bin/recordFinder.cgi?action=find&name=AccessControlCard&condition=
```

- Por cada `UserID + CardName`, si no existe `Persona`, la crea con tipo `Administrativo`
- HTTP Digest Auth automática

### 2. Asistencia (paginada)

`POST /api/asistencia/sincronizar` consulta `AccessControlCardRec` con paginación:

```
GET /cgi-bin/recordFinder.cgi?action=find&name=AccessControlCardRec&StartTime=<ultimoTs>&count=500
```

**Algoritmo:**
1. Obtiene el último `fecha` registrado en DB → lo usa como `StartTime`
2. Consulta con `count=500`
3. Si `found == 500`, toma el `CreateTime` del último registro → nuevo `StartTime` y repite
4. Deduplica por `RecNo`
5. Inserta registros nuevos (filtra `userId` vacío y `ErrorCode != 0`)
6. Recalcula Entrada/Salida por `(personaId, día)`: alterna (1°=Entrada, 2°=Salida, ...)
7. Cron automático cada 5 minutos (`@Cron('*/5 * * * *')`)

### 3. Deduplicación

- **Clave única**: `(userId, fecha)` — timestamp exacto
- Si el Dahua recicla `RecNo` por buffer circular, el sistema lo detecta como registro distinto (diferente timestamp)

---

## Webhook de eventos (push)

**Endpoint**: `POST /api/dahua/event` (público, sin JWT)

Acepta `multipart/form-data` y `application/json`.

**Campos esperados:**
- `UserID` — ID del usuario en el Dahua
- `Time` o `EventTime` — timestamp del evento
- `Method` — método de autenticación (Face, Card, etc.)

**Flujo:**
1. Recibe el POST del Dahua (configurado vía "Push Person Info")
2. Busca la Persona por `userId` — si no existe, consulta `AccessControlCard` y la crea automáticamente
3. Inserta en `Asistencia` (con dedup)
4. Recalcula Entrada/Salida para ese día
5. Responde 200 OK

**Configuración en el Dahua:**
- URL: `http://10.20.20.3:3000/api/dahua/event` (vía VPN)
- Puerto: `3000`
- Path: `/api/dahua/event`

---

## Dashboard de presencia

`GET /api/asistencia/dashboard?fecha=YYYY-MM-DD`

**Respuesta:**
```json
{
  "fecha": "2026-07-01",
  "personas": [
    { "personaId": 1, "nombre": "MANZO SERGIO DAVID", "entrada": "06:53", "salida": null, "dentro": true },
    { "personaId": 2, "nombre": "CALDERON LAURA", "entrada": "07:04", "salida": "08:15", "dentro": false }
  ]
}
```

**Visualización:**
- Timeline 06:00-19:00
- Por persona: bloque de color desde `entrada` hasta `salida` (o `ahora` si sigue adentro)
- Leyenda: "X personas Y adentro"
- Auto-refresh: 5 minutos
- Ordenados: adentro primero, luego por hora de entrada

---

## Desarrollo local

```bash
# Backend
cd backend
npm install
npm run start:dev      # http://localhost:3000

# Frontend (otra terminal)
cd frontend
npm install
npm run dev            # http://localhost:5173 (proxy /api → :3000)
```

El frontend en desarrollo proxyfica `/api` al backend. No se necesita Caddy ni Docker para desarrollo local (excepto PostgreSQL y VPN para el Dahua).

---

## Solución de problemas

### La base de datos está vacía
- No usar `docker compose down -v` (borra el volumen)
- Usar `docker compose up -d --build` para actualizar

### El sync no trae registros nuevos
- Verificar conectividad con el Dahua: `docker exec dahua-app node -e "require('http').get('http://10.10.10.100')"...`
- Verificar logs: `docker logs dahua-app | grep "Página"`
- Verificar que el Dahua tenga `AccessControlCardRec` con nuevos registros (interfaz web del Dahua)

### El Dashboard muestra pocas personas
- El sync se ejecuta cada 5 minutos. Para forzarlo: `POST /api/asistencia/sincronizar`
- Si hay personas nuevas en el Dahua, sincronizar personas: `POST /api/personas/sincronizar`

### Errores de CORS
- El backend tiene `app.enableCors({ origin: true })`
- En producción, Caddy maneja el dominio. En desarrollo, Vite proxyfica `/api`

### El frontend muestra 404 al recargar (F5)
- El backend tiene una ruta catch-all que sirve `index.html` para cualquier path que no sea `/api/*`
- Si persiste, verificar que `main.ts` tenga `express.get('*', ...)` después de `setGlobalPrefix`
