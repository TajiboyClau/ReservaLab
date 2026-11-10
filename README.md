# ReservaLab

Sistema para consultar y reservar laboratorios y salones de la Facultad de Ingeniería.

## Equipo

El equipo de trabajo de este repositorio es una pareja conformada por:

- Wilberth Daniel Velasquez Flores - 202408061
- Claudia Estefanía Zorin Tajiboy - 202408031

## Requisitos

- Docker Desktop con Docker Compose.
- Node.js 22.12 o posterior y pnpm 11 para desarrollo local.

## Clonar y ejecutar el sistema completo

Clona el repositorio y entra a su carpeta:

```powershell
git clone https://github.com/TajiboyClau/ReservaLab.git
cd ReservaLab
```

Abre Docker Desktop y, desde esa carpeta, construye y levanta los servicios:

```powershell
docker compose up --build -d
```

La primera ejecución puede tardar mientras Docker descarga imágenes y construye la web y la API. El contenedor de la API aplica las migraciones de PostgreSQL y carga los datos de demostración al iniciar.

Comprueba que los contenedores estén arriba:

```powershell
docker compose ps
```

Al terminar de iniciar, abre la web o la documentación de la API:

- Web: `http://localhost:8080`
- API: `http://localhost:3000/api/v1`
- OpenAPI/Swagger: `http://localhost:3000/docs`
- Mockoon: `http://localhost:3001/notifications`
- PostgreSQL para DBeaver: host `localhost`, puerto `55432`, base `reservalab`, usuario `postgres`, contraseña `reservalab_dev`.
- Redis: host `localhost`, puerto `6379`.

La configuración predeterminada es para desarrollo académico. PostgreSQL se publica en el puerto 55432 para evitar conflictos con instalaciones locales. Para cambiar puertos o secretos, copia `.env.example` a `.env` en la raíz y edita esa copia antes de iniciar Compose. No subas `.env` al repositorio.

El primer inicio aplica las migraciones y carga datos de demostración. Usuarios locales:

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@reservalab.local` | `Admin12345!` |
| Docente | `docente@reservalab.local` | `Docente12345!` |

El seed también crea un laboratorio llamado **Laboratorio 1**. Estas credenciales son solo para el entorno de demostración.
El laboratorio de demostración tiene horario de lunes a domingo, de 07:00 a 22:00 (hora de Guatemala). El administrador puede definir, consultar y eliminar rangos semanales desde la API.

Para probar la vista **Ocupación actual**, ejecuta `pnpm dev:cli`, inicia sesión como administrador y elige `2` para emitir una API key con permiso `read:now`. Cópiala cuando aparezca, porque solo se muestra una vez, y pégala en la vista de ocupación del sitio.

Para ver registros de los servicios o apagarlos:

```powershell
docker compose logs -f
docker compose down
```

`docker compose down` conserva los datos de PostgreSQL y Redis. Para borrar también los volúmenes y todos los datos locales, usa `docker compose down -v`.

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

Ejecuta estos comandos desde la raíz del repositorio. `pnpm install` es necesario para el desarrollo local y para correr las pruebas; Docker instala las dependencias dentro de sus imágenes al construir.

```powershell
pnpm install
pnpm build
pnpm dev:api
pnpm dev:web
pnpm dev:cli
pnpm --filter @reservalab/api test
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

## Documentación técnica

- [Arquitectura, componentes, flujos y atributos de calidad](docs/arquitectura.md)
- [Modelo de datos](docs/modelo-datos.dbml)
- [Especificación OpenAPI](apps/api/openapi.json), también disponible en `http://localhost:3000/docs` cuando el sistema está levantado.
- [Decisiones de arquitectura (ADR)](docs/adr/)

El README reúne los pasos de instalación y ejecución; los documentos enlazados contienen el detalle de arquitectura, modelo de datos y contrato de la API.

## Contribuciones

El trabajo se dividió entre la implementación inicial de ReservaLab y las mejoras realizadas después de probar el sistema. Los aportes se describen según los cambios que registra el historial del repositorio.

| Integrante | Aportes |
|---|---|
| Claudia Estefanía Zorin Tajiboy | Implementación principal: estructura del monorepo y entorno Docker, modelo de datos y migraciones de PostgreSQL, API de autenticación y gestión de usuarios, espacios, horarios y reservas. También integró las API keys, Redis y Mockoon, creó la interfaz web inicial y el CLI, y añadió las pruebas iniciales y la documentación de arquitectura. |
| Wilberth Daniel Velasquez Flores | Mejoras posteriores: validación de los límites de horario con pruebas de regresión, rotación de tokens de sesión en una transacción y separación de la consulta de ocupación en un servicio. También aisló la prueba de notificaciones, configuró Turborepo y actualizó la interfaz con la identidad visual de la UMES, la cuenta regresiva y la opción para cambiar la clave de lectura. |

## Git

Usen commits pequeños con Conventional Commits, por ejemplo `feat(api): agregar reserva` o `test(reservas): validar traslapes`. Ambos integrantes deben participar en el historial y revisar cambios del otro.
