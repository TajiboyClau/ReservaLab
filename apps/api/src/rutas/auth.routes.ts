import { Router } from "express";
import { authController } from "../controladores/auth.controller.js";
import { requiereSesion } from "../middleware/autenticacion.js";

export const authRoutes = Router();
authRoutes.post("/register", authController.registrar);
authRoutes.post("/login", authController.iniciarSesion);
authRoutes.post("/refresh", authController.renovar);
authRoutes.post("/logout", requiereSesion, authController.cerrarSesion);
