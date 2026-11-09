import { Router } from "express";
import { authController } from "../controladores/auth.controller.js";
import { requiereRol, requiereSesion } from "../middleware/autenticacion.js";

export const usuariosRoutes = Router();
usuariosRoutes.use(requiereSesion, requiereRol("administrador"));
usuariosRoutes.get("/", authController.listarUsuarios);
usuariosRoutes.patch("/:id", authController.actualizarUsuario);
