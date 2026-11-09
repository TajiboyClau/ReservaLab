import { prisma } from "../db/prisma.js";

export const usuariosRepo = {
  porCorreo: (correo: string) => prisma.usuario.findUnique({ where: { correo } }),
  porId: (id: string) => prisma.usuario.findUnique({ where: { id } }),
  crear: (datos: { nombre: string; correo: string; contrasenaHash: string }) =>
    prisma.usuario.create({ data: datos }),
  listar: () => prisma.usuario.findMany({ select: { id: true, nombre: true, correo: true, rol: true, activo: true, creadoEn: true }, orderBy: { creadoEn: "asc" } }),
  actualizar: (id: string, datos: { rol?: string; activo?: boolean }) => prisma.usuario.update({ where: { id }, data: datos, select: { id: true, nombre: true, correo: true, rol: true, activo: true, creadoEn: true } }),
};
