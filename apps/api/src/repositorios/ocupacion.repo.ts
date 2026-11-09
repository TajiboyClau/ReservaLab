import { prisma } from "../db/prisma.js";

export async function ocupacionActual() {
  const ahora = new Date();
  const espacios = await prisma.espacio.findMany({
    where: { activo: true },
    include: {
      reservas: {
        where: { estado: "activa", inicio: { lte: ahora }, fin: { gt: ahora } },
        select: { inicio: true, fin: true, grupo: true, proposito: true },
      },
    },
    orderBy: [{ edificio: "asc" }, { nombre: "asc" }],
  });
  return espacios.map(({ reservas, ...espacio }) => ({
    ...espacio,
    ocupado: reservas.length > 0,
    reservaActual: reservas[0] ?? null,
  }));
}
