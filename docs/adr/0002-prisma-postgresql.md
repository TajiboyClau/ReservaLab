# ADR 0002: PostgreSQL con Prisma ORM

- Estado: Aceptada
- Fecha: 2026-11-08

## Contexto

El sistema requiere relaciones, migraciones versionadas, seed y una regla de exclusión para proteger horarios bajo concurrencia.

## Decisión

Usar PostgreSQL y Prisma ORM. El esquema Prisma define tablas y relaciones; una migración SQL versionada instala `btree_gist` y declara la restricción de exclusión GiST porque es una regla propia de PostgreSQL.

## Alternativas consideradas

- Drizzle: tipado cercano a SQL y buena flexibilidad, pero el grupo tendría que implementar más convenciones de migración/seed para este proyecto.
- PostgreSQL sin ORM: permite control directo de SQL, pero no evidencia la competencia de uso de ORM solicitada.
- Validar traslape solo en la API: no protege dos solicitudes que llegan simultáneamente; se descarta por riesgo de doble reserva.

## Consecuencias

El ORM ofrece cliente tipado y migraciones mantenibles. La restricción específica permanece en SQL y debe conservarse en futuras migraciones.
