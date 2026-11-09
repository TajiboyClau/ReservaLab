import type { Request, Response } from "express";
import { espaciosService } from "../servicios/espacios.service.js";
import { responderConCache } from "../utilidades/respuesta-cache.js";

export const espaciosController = {
  async listar(req: Request, res: Response) {
    const edificio = typeof req.query.edificio === "string" ? req.query.edificio : "";
    const capacidad = typeof req.query.capacidad === "string" ? req.query.capacidad : "";
    await responderConCache(res, `cache:spaces:${edificio}:${capacidad}`, () => espaciosService.listar(req.query));
  },
  async crear(req: Request, res: Response) { res.status(201).json(await espaciosService.crear(req.body)); },
  async actualizar(req: Request, res: Response) {
    const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id;
    res.json(await espaciosService.actualizar(id, req.body));
  },
  async eliminar(req: Request, res: Response) {
    const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id;
    res.json(await espaciosService.eliminar(id));
  },
};
