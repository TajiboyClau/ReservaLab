import { prisma } from "../db/prisma.js";

export const clavesApiRepo = {
  porHash: (claveHash: string) => prisma.claveApi.findUnique({ where: { claveHash } }),
  porId: (id: string) => prisma.claveApi.findUnique({ where: { id } }),
  crear: (datos: { nombre: string; prefijo: string; claveHash: string; permisos: string[] }) => prisma.claveApi.create({ data: datos }),
  listar: () => prisma.claveApi.findMany({
    select: { id: true, nombre: true, prefijo: true, permisos: true, ultimoUsoEn: true, revocadaEn: true, creadoEn: true },
    orderBy: { creadoEn: "desc" },
  }),
  revocar: (id: string) => prisma.claveApi.update({
    where: { id }, data: { revocadaEn: new Date() },
    select: { id: true, nombre: true, revocadaEn: true },
  }),
  registrarUso: (id: string) => prisma.claveApi.update({ where: { id }, data: { ultimoUsoEn: new Date() } }),
};
