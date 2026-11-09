import { prisma } from "../db/prisma.js";

export const horariosRepo = {
  deEspacio: (espacioId: string) => prisma.horarioDisponible.findMany({ where: { espacioId }, orderBy: [{ diaSemana: "asc" }, { horaInicio: "asc" }] }),
  deDia: (espacioId: string, diaSemana: number) => prisma.horarioDisponible.findMany({ where: { espacioId, diaSemana }, orderBy: { horaInicio: "asc" } }),
  crear: (datos: { espacioId: string; diaSemana: number; horaInicio: Date; horaFin: Date }) => prisma.horarioDisponible.create({ data: datos }),
  eliminar: (espacioId: string, id: string) => prisma.horarioDisponible.deleteMany({ where: { espacioId, id } }),
};
