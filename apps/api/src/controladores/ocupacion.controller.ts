import type { Request, Response } from "express";
import { ocupacionActual } from "../repositorios/ocupacion.repo.js";
import { responderConCache } from "../utilidades/respuesta-cache.js";

export async function consultarOcupacion(_req: Request, res: Response) {
  await responderConCache(res, "cache:now:todos", ocupacionActual);
}
