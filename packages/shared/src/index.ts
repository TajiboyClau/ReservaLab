import { z } from "zod";

export const rolesUsuario = ["estudiante", "docente", "administrador"] as const;
export type RolUsuario = (typeof rolesUsuario)[number];

export const crearEspacioSchema = z.object({
  nombre: z.string().trim().min(1).max(120),
  edificio: z.string().trim().min(1).max(120),
  tipo: z.enum(["laboratorio", "salon"]),
  capacidad: z.coerce.number().int().positive(),
  descripcion: z.string().max(4000).optional(),
});
export type CrearEspacio = z.infer<typeof crearEspacioSchema>;

export const horarioDisponibleSchema = z.object({
  diaSemana: z.coerce.number().int().min(1).max(7),
  horaInicio: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa HH:mm"),
  horaFin: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa HH:mm"),
});
export type HorarioDisponibleEntrada = z.infer<typeof horarioDisponibleSchema>;

export const crearReservaSchema = z.object({
  espacioId: z.uuid(),
  grupo: z.string().trim().max(120).optional(),
  proposito: z.string().trim().min(1).max(250),
  inicio: z.iso.datetime({ offset: true }).transform((valor) => new Date(valor)),
  fin: z.iso.datetime({ offset: true }).transform((valor) => new Date(valor)),
});
export type CrearReserva = z.infer<typeof crearReservaSchema>;

export type BloqueDisponibilidad = {
  estado: "libre" | "ocupado";
  inicio: string;
  fin: string;
};
