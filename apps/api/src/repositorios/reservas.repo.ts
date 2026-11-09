import { prisma } from "../db/prisma.js";

export const reservasRepo = {
  espacio: (id: string) => prisma.espacio.findUnique({ where: { id } }),
  traslape: (espacioId: string, inicio: Date, fin: Date) => prisma.reserva.findFirst({
    where: { espacioId, estado: "activa", inicio: { lt: fin }, fin: { gt: inicio } },
  }),
  crear: (datos: { espacioId: string; usuarioId: string; grupo?: string; proposito: string; inicio: Date; fin: Date }) =>
    prisma.reserva.create({ data: datos }),
  propias: (usuarioId: string) => prisma.reserva.findMany({
    where: { usuarioId }, include: { espacio: true }, orderBy: { inicio: "desc" },
  }),
  porId: (id: string) => prisma.reserva.findUnique({ where: { id } }),
  cancelar: (id: string) => prisma.reserva.update({
    where: { id }, data: { estado: "cancelada", canceladaEn: new Date() },
  }),
  porEspacioYDia: (espacioId: string, inicio: Date, fin: Date) => prisma.reserva.findMany({
    where: { espacioId, estado: "activa", inicio: { lt: fin }, fin: { gt: inicio } },
    select: { id: true, inicio: true, fin: true, estado: true }, orderBy: { inicio: "asc" },
  }),
};
