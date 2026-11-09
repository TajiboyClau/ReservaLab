# ReservaLab

Sistema para consultar y reservar laboratorios y salones de la Facultad de Ingeniería.

## Equipo

El equipo de trabajo de este repositorio es una pareja conformada por:

- Wilberth Daniel Velasquez Flores - 202408061
- Claudia Estefanía Zorin Tajiboy - 202408031

## Requisitos

- Docker Desktop con Docker Compose.
- Node.js 22.12 o posterior y pnpm 11 para desarrollo local.

## Levantar el sistema completo

En la raíz del repositorio, ejecuta:

```powershell
docker compose up --build -d
```

Al terminar de iniciar:

- Web: `http://localhost:8080`
- API: `http://localhost:3000/api/v1`
- OpenAPI/Swagger: `http://localhost:3000/docs`
- Mockoon: `http://localhost:3001/notifications`
- PostgreSQL para DBeaver: host `localhost`, puerto `55432`, base `reservalab`, usuario `postgres`, contraseña `reservalab_dev`.
- Redis: host `localhost`, puerto `6379`.

La configuración predeterminada es para desarrollo académico. PostgreSQL se publica en el puerto 55432 para evitar conflictos con instalaciones locales. Puedes cambiar los puertos y secretos en una copia local de `.env.example` llamada `.env`.

El primer inicio aplica las migraciones y carga datos de demostración. Usuarios locales:

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@reservalab.local` | `Admin12345!` |
| Docente | `docente@reservalab.local` | `Docente12345!` |

El seed también crea un laboratorio llamado **Laboratorio 1**. Estas credenciales son solo para el entorno de demostración.
El laboratorio de demostración tiene horario de lunes a domingo, de 07:00 a 22:00 (hora de Guatemala). El administrador puede definir, consultar y eliminar rangos semanales desde la API.

Para probar la vista **Ocupación actual**, ejecuta `pnpm dev:cli`, inicia sesión como administrador y elige `2` para emitir una API key con permiso `read:now`. Cópiala cuando aparezca, porque solo se muestra una vez, y pégala en la vista de ocupación del sitio.

## Desarrollo sin Docker para PostgreSQL

1. Copia `apps/api/.env.example` como `apps/api/.env` y configura la contraseña de tu PostgreSQL local. No compartas ni subas `.env`.
2. Instala los paquetes con `pnpm install`.
3. Ejecuta `pnpm db:generate`, `pnpm db:migrate` y `pnpm db:seed`.
4. Inicia Redis y Mockoon con Docker usando `docker compose up -d redis mockoon`.
5. Inicia el backend con `pnpm dev:api` y la web con `pnpm dev:web`.

## Endpoints principales

Todos usan el prefijo `/api/v1` y JSON:

| Endpoint | Acceso | Función |
|---|---|---|
| `GET /health` | Público | Estado de PostgreSQL y Redis |
| `POST /auth/register` | Público | Registro de estudiante |
| `POST /auth/login` | Público | Login; emite access token de 15 min y refresh token de 7 días |
| `POST /auth/refresh` | Refresh token | Rota los tokens |
| `POST /auth/logout` | JWT | Revoca el refresh token |
| `GET /spaces` | JWT o API key `read:spaces` | Lista espacios con filtro por edificio y capacidad |
| `POST /spaces`, `PATCH /spaces/:id`, `DELETE /spaces/:id` | Administrador | Crear, modificar o desactivar espacios |
| `GET /spaces/:id/availability?date=AAAA-MM-DD` | JWT o API key `read:spaces` | Consulta bloques libres y ocupados |
| `GET /spaces/:id/schedules`, `POST /spaces/:id/schedules`, `DELETE /spaces/:id/schedules/:horarioId` | Consulta: JWT o API key; cambios: administrador | Gestiona disponibilidad semanal del espacio |
| `POST /reservations` | Docente o administrador | Crea reserva y rechaza traslapes con 409 |
| `GET /reservations/me` | JWT | Lista reservas propias |
| `GET /admin/users`, `PATCH /admin/users/:id` | Administrador | Lista usuarios y cambia su rol o estado |
| `DELETE /reservations/:id` | Dueño o administrador | Cancela una reserva |
| `POST /api-keys`, `GET /api-keys`, `DELETE /api-keys/:id` | Administrador | Emite, lista y revoca claves de sistemas |
| `GET /now` | API key `read:now` | Ocupación actual por edificio |

La clave API completa se muestra únicamente al crearla; PostgreSQL guarda su hash. Las lecturas aplicables usan Redis por 60 segundos e incluyen `X-Cache: HIT` o `MISS`. Las API keys tienen un límite de 60 solicitudes por minuto. Al crear o cancelar una reserva, se invalida la disponibilidad del espacio y se avisa al servicio de Mockoon.

## Organización de código

- `apps/api`: API Express organizada en rutas/middleware, controladores MVC, servicios y repositorios con Prisma.
- `apps/web`: tres vistas sencillas en HTML y TypeScript con Vite; no usa framework de componentes.
- `apps/cli`: utilidad de administración para crear espacios y emitir API keys.
- `packages/shared`: tipos y validaciones Zod compartidos.
- `docs/arquitectura.md` y `docs/adr/`: vistas, atributos de calidad y decisiones arquitectónicas.
- `apps/api/openapi.json`: contrato OpenAPI, visible en `/docs`.
- `mocks/notificaciones.json`: entorno exportado de Mockoon.

## Comandos útiles

```powershell
pnpm install
pnpm build
pnpm dev:api
pnpm dev:web
pnpm dev:cli
pnpm --filter @reservalab/api test:coverage
```

La cobertura de ese comando mide la capa de servicios de la API. Para ejecutar además el flujo integrado contra los contenedores locales, levanta primero Compose y luego, en PowerShell:

```powershell
$env:DATABASE_URL = 'postgresql://postgres:reservalab_dev@localhost:55432/reservalab?schema=public'
$env:JWT_ACCESS_SECRET = 'reservalab-access-secret-local-2026-change-me'
$env:JWT_REFRESH_SECRET = 'reservalab-refresh-secret-local-2026-change-me'
$env:REDIS_URL = 'redis://localhost:6379'
$env:NOTIFICATIONS_URL = 'http://localhost:3001/notifications'
$env:RUN_DB_INTEGRATION = '1'
pnpm --filter @reservalab/api test:integration
```

La disponibilidad se muestra dentro de los horarios definidos para cada día, en hora de Guatemala. La web lista los tramos libres y ocupados; el servidor verifica el horario y vuelve a validar traslapes al guardar.

## Declaración de IA y contribuciones

Se utilizó OpenAI Codex como apoyo para preparar y revisar el modelo de datos, código inicial, documentación y configuración. El equipo declara los siguientes aportes compartidos y debe revisar y poder explicar cada módulo durante la defensa.

Completen esta tabla con los cambios que cada integrante efectivamente realizó o revisó:

| Integrante | Aportes realizados |
|---|---|
| Wilberth Daniel Velasquez Flores | Trabajo en pareja: definición del alcance, revisión del flujo, validación funcional y preparación de la demostración. |
| Claudia Estefanía Zorin Tajiboy | Trabajo en pareja: definición del alcance, revisión del flujo, validación funcional y preparación de la demostración. |

Ambos integrantes deben verificar esta descripción, participar en la revisión del código y poder explicar el proyecto entregado.

## Git

Usen commits pequeños con Conventional Commits, por ejemplo `feat(api): agregar reserva` o `test(reservas): validar traslapes`. Ambos integrantes deben participar en el historial y revisar cambios del otro.
