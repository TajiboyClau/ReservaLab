import type { Request, Response } from "express";
import { horariosService } from "../servicios/horarios.service.js";

export const horariosController = {
  async listar(req: Request, res: Response) { res.json(await horariosService.listar(String(req.params.id))); },
  async crear(req: Request, res: Response) { res.status(201).json(await horariosService.crear(String(req.params.id), req.body)); },
  async eliminar(req: Request, res: Response) { res.json(await horariosService.eliminar(String(req.params.id), String(req.params.horarioId))); },
};
