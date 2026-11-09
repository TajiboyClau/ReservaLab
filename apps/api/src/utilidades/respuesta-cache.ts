import type { Response } from "express";
import { guardarCache, leerCache } from "../db/redis.js";

export async function responderConCache<T>(res: Response, clave: string, consultar: () => Promise<T>) {
  const guardado = await leerCache<T>(clave);
  if (guardado !== null) {
    res.setHeader("X-Cache", "HIT");
    return res.json(guardado);
  }
  const resultado = await consultar();
  await guardarCache(clave, resultado, 60);
  res.setHeader("X-Cache", "MISS");
  return res.json(resultado);
}
