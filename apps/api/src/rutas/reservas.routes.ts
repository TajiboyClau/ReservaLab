import { Router } from "express";
import { reservasController } from "../controladores/reservas.controller.js";
import { requiereRol, requiereSesion } from "../middleware/autenticacion.js";

export const reservasRoutes = Router();
reservasRoutes.use(requiereSesion);
reservasRoutes.post("/", requiereRol("docente", "administrador"), reservasController.crear);
reservasRoutes.get("/me", reservasController.propias);
reservasRoutes.delete("/:id", reservasController.cancelar);
