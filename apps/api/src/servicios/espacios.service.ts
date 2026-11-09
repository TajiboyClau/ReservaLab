import { z } from "zod";
import { crearEspacioSchema } from "@reservalab/shared";
import { espaciosRepo } from "../repositorios/espacios.repo.js";

export const espaciosService = {
  listar(filtros: { edificio?: unknown; capacidad?: unknown }) {
    return espaciosRepo.listar({
      edificio: typeof filtros.edificio === "string" ? filtros.edificio : undefined,
      capacidad: filtros.capacidad === undefined ? undefined : z.coerce.number().int().positive().parse(filtros.capacidad),
    });
  },
  crear(entrada: unknown) { return espaciosRepo.crear(crearEspacioSchema.parse(entrada)); },
  async actualizar(id: string, entrada: unknown) {
    const datos = crearEspacioSchema.partial().parse(entrada);
    if (!Object.keys(datos).length) throw Object.assign(new Error("Indica al menos un campo para actualizar"), { statusCode: 400 });
    const espacio = await espaciosRepo.porId(id);
    if (!espacio || !espacio.activo) throw Object.assign(new Error("Espacio no encontrado"), { statusCode: 404 });
    return espaciosRepo.actualizar(id, datos);
  },
  async eliminar(id: string) {
    const espacio = await espaciosRepo.porId(id);
    if (!espacio || !espacio.activo) throw Object.assign(new Error("Espacio no encontrado"), { statusCode: 404 });
    await espaciosRepo.desactivar(id);
    return { mensaje: "Espacio desactivado" };
  },
};
