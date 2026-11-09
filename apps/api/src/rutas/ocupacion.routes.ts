import { Router } from "express";
import { consultarOcupacion } from "../controladores/ocupacion.controller.js";
import { requiereSesionOClave } from "../middleware/autenticacion.js";

export const ocupacionRoutes = Router();
ocupacionRoutes.get("/", requiereSesionOClave("read:now", false), consultarOcupacion);
