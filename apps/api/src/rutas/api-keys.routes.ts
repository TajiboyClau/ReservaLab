import { Router } from "express";
import { clavesApiController } from "../controladores/api-keys.controller.js";
import { requiereRol, requiereSesion } from "../middleware/autenticacion.js";

export const clavesApiRoutes = Router();
clavesApiRoutes.use(requiereSesion, requiereRol("administrador"));
clavesApiRoutes.post("/", clavesApiController.crear);
clavesApiRoutes.get("/", clavesApiController.listar);
clavesApiRoutes.delete("/:id", clavesApiController.revocar);
