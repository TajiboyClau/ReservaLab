import { Router } from "express";
import { espaciosController } from "../controladores/espacios.controller.js";
import { horariosController } from "../controladores/horarios.controller.js";
import { reservasController } from "../controladores/reservas.controller.js";
import { requiereRol, requiereSesion, requiereSesionOClave } from "../middleware/autenticacion.js";

export const espaciosRoutes = Router();
espaciosRoutes.get("/", requiereSesionOClave("read:spaces"), espaciosController.listar);
espaciosRoutes.post("/", requiereSesion, requiereRol("administrador"), espaciosController.crear);
espaciosRoutes.patch("/:id", requiereSesion, requiereRol("administrador"), espaciosController.actualizar);
espaciosRoutes.delete("/:id", requiereSesion, requiereRol("administrador"), espaciosController.eliminar);
espaciosRoutes.get("/:id/availability", requiereSesionOClave("read:spaces"), reservasController.disponibilidad);
espaciosRoutes.get("/:id/schedules", requiereSesionOClave("read:spaces"), horariosController.listar);
espaciosRoutes.post("/:id/schedules", requiereSesion, requiereRol("administrador"), horariosController.crear);
espaciosRoutes.delete("/:id/schedules/:horarioId", requiereSesion, requiereRol("administrador"), horariosController.eliminar);
