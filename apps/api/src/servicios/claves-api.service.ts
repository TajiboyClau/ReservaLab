import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { clavesApiRepo } from "../repositorios/claves-api.repo.js";

const crearSchema = z.object({
  nombre: z.string().trim().min(1).max(120),
  permisos: z.array(z.enum(["read:spaces", "read:now"])).min(1),
});
const hash = (valor: string) => createHash("sha256").update(valor).digest("hex");

export const clavesApiService = {
  async crear(entrada: unknown) {
    const datos = crearSchema.parse(entrada);
    const clave = `rl_live_${randomBytes(32).toString("hex")}`;
    const fila = await clavesApiRepo.crear({
      ...datos,
      prefijo: "rl_live_",
      claveHash: hash(clave),
    });
    return { id: fila.id, nombre: fila.nombre, permisos: fila.permisos, clave };
  },
  listar() { return clavesApiRepo.listar(); },
  async revocar(id: string) {
    const existente = await clavesApiRepo.porId(id);
    if (!existente) throw Object.assign(new Error("Clave API no encontrada"), { statusCode: 404 });
    if (existente.revocadaEn) throw Object.assign(new Error("La clave API ya está revocada"), { statusCode: 409 });
    return clavesApiRepo.revocar(id);
  },
};
