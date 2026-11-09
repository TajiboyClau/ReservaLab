import type { Request, Response } from "express";
import { reservasService } from "../servicios/reservas.service.js";
import { responderConCache } from "../utilidades/respuesta-cache.js";

export const reservasController = {
  async crear(req: Request, res: Response) {
    res.status(201).json(await reservasService.crear(req.auth!.usuarioId, req.body));
  },
  async propias(req: Request, res: Response) { res.json(await reservasService.propias(req.auth!.usuarioId)); },
  async cancelar(req: Request, res: Response) {
    const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id;
    res.json(await reservasService.cancelar(id, req.auth!.usuarioId, req.auth!.rol));
  },
  async disponibilidad(req: Request, res: Response) {
    const id = Array.isArray(req.params.id) ? req.params.id[0]! : req.params.id;
    const fecha = typeof req.query.date === "string" ? req.query.date : "";
    await responderConCache(res, `cache:availability:${id}:${fecha}`, () => reservasService.disponibilidad(id, req.query.date));
  },
};
