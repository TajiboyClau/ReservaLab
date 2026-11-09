# ADR 0001: API Express organizada en capas

- Estado: Aceptada
- Fecha: 2026-11-08

## Contexto

La API es el único componente con reglas de negocio y el curso evalúa capas de rutas/middleware, controladores, servicios y repositorios, además de MVC.

## Decisión

Usar Express con TypeScript y separar cada responsabilidad en rutas, middleware, controladores, servicios y repositorios.

## Alternativas consideradas

- Fastify: ofrece buen rendimiento y plugins, pero no aporta una ventaja necesaria para el tamaño del proyecto y requiere que el equipo aprenda otra convención.
- Lógica directamente en rutas/controladores: menos archivos, pero mezcla HTTP, reglas y persistencia y dificulta mocks.

## Consecuencias

El flujo añade estructura y algo de código de delegación; a cambio, los servicios se prueban aislados, las rutas se leen claramente y los controladores no acceden a Prisma.
