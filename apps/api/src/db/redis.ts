import { createClient } from "redis";

export const redis = createClient({ url: process.env.REDIS_URL ?? "redis://localhost:6379" });
redis.on("error", (error) => console.error("Redis:", error.message));

export async function iniciarRedis() {
  if (redis.isOpen) return;
  try {
    await redis.connect();
  } catch (error) {
    console.error("No se pudo conectar a Redis; la API seguirá sin caché hasta reconectar.", error);
  }
}

export async function leerCache<T>(clave: string): Promise<T | null> {
  if (!redis.isReady) return null;
  const contenido = await redis.get(clave);
  return contenido ? JSON.parse(contenido) as T : null;
}

export async function guardarCache(clave: string, valor: unknown, segundos = 60) {
  if (redis.isReady) await redis.set(clave, JSON.stringify(valor), { EX: segundos });
}

export async function invalidarDisponibilidad(espacioId: string) {
  if (!redis.isReady) return;
  const claves = await redis.keys(`cache:availability:${espacioId}:*`);
  if (claves.length) await redis.del(claves);
  await redis.del("cache:now:todos");
}
