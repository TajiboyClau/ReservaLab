import type { Request, Response } from "express";
import { authService } from "../servicios/auth.service.js";

export const authController = {
  async listarUsuarios(_req: Request, res: Response) { res.json(await authService.listarUsuarios()); },
  async actualizarUsuario(req: Request, res: Response) { res.json(await authService.actualizarUsuario(String(req.params.id), req.auth!.usuarioId, req.body)); },
  async registrar(req: Request, res: Response) { res.status(201).json(await authService.registrar(req.body)); },
  async iniciarSesion(req: Request, res: Response) { res.json(await authService.iniciarSesion(req.body)); },
  async renovar(req: Request, res: Response) { res.json(await authService.renovar(req.body)); },
  async cerrarSesion(req: Request, res: Response) { res.json(await authService.cerrarSesion(req.body)); },
};
