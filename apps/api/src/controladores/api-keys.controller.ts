import type { Request, Response } from "express";
import { clavesApiService } from "../servicios/claves-api.service.js";

export const clavesApiController = {
  async crear(req: Request, res: Response) { res.status(201).json(await clavesApiService.crear(req.body)); },
  async listar(_req: Request, res: Response) { res.json(await clavesApiService.listar()); },
  async revocar(req: Request, res: Response) {
    const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id;
    res.json(await clavesApiService.revocar(id));
  },
};
