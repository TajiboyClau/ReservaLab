# ADR 0003: Redis para caché y límite de API keys

- Estado: Aceptada
- Fecha: 2026-11-08

## Contexto

Las lecturas de espacios, disponibilidad y ocupación pueden repetirse, y la pantalla informativa usa una identidad de sistema separada de las cuentas personales.

## Decisión

Guardar esas respuestas en Redis por 60 segundos, invalidarlas cuando una reserva cambia y usar un contador con ventana de 60 segundos por API key. Las claves se envían en `X-API-Key`; PostgreSQL conserva únicamente su hash y permisos.

## Alternativas consideradas

- Caché en memoria de la API: sencilla, pero no se comparte entre instancias y se pierde al reiniciar.
- JWT para la pantalla: identifica personas, no el sistema consumidor; la API key modela mejor esa integración.
- Sin caché: mantiene lecturas correctas, pero no evidencia el requisito de Redis ni reduce consultas repetidas.

## Consecuencias

Se añade Redis como dependencia del entorno. La API comunica el resultado con `X-Cache: HIT/MISS`; una key excedida recibe 429 y una key sin permiso recibe 403.
