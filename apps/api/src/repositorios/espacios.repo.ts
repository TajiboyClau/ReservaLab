import { prisma } from "../db/prisma.js";

export const espaciosRepo = {
  listar: (filtros: { edificio?: string; capacidad?: number }) => prisma.espacio.findMany({
    where: {
      activo: true,
      ...(filtros.edificio ? { edificio: { contains: filtros.edificio, mode: "insensitive" as const } } : {}),
      ...(filtros.capacidad ? { capacidad: { gte: filtros.capacidad } } : {}),
    },
    orderBy: [{ edificio: "asc" }, { nombre: "asc" }],
  }),
  porId: (id: string) => prisma.espacio.findUnique({ where: { id } }),
  crear: (datos: { nombre: string; edificio: string; tipo: string; capacidad: number; descripcion?: string }) =>
    prisma.espacio.create({ data: datos }),
  actualizar: (id: string, datos: Partial<{ nombre: string; edificio: string; tipo: string; capacidad: number; descripcion: string | null }>) =>
    prisma.espacio.update({ where: { id }, data: datos }),
  desactivar: (id: string) => prisma.espacio.update({ where: { id }, data: { activo: false } }),
};
