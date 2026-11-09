import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export const manejadorErrores: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: "Datos inválidos", detalles: error.issues });
  }
  if (typeof error?.statusCode === "number") {
    return res.status(error.statusCode).json({ error: error.message });
  }
  console.error(error);
  res.status(500).json({ error: "Ocurrió un error interno" });
};
