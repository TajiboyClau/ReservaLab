import type { Request, Response } from "express";
import { consultarOcupacionActual } from "../servicios/ocupacion.service.js";
import { responderConCache } from "../utilidades/respuesta-cache.js";

export async function consultarOcupacion(_req: Request, res: Response) {
  await responderConCache(res, "cache:now:todos", consultarOcupacionActual);
}
