import { prisma } from "../db/prisma.js";

export const tokensRepo = {
  crear: (usuarioId: string, tokenHash: string, venceEn: Date) =>
    prisma.tokenActualizacion.create({ data: { usuarioId, tokenHash, venceEn } }),
  rotar(id: string, nuevoToken: { usuarioId: string; tokenHash: string; venceEn: Date }) {
    return prisma.$transaction(async (tx) => {
      const ahora = new Date();
      const resultado = await tx.tokenActualizacion.updateMany({
        where: { id, usuarioId: nuevoToken.usuarioId, revocadoEn: null, venceEn: { gt: ahora } },
        data: { revocadoEn: ahora },
      });
      if (resultado.count === 0) return false;
      await tx.tokenActualizacion.create({ data: nuevoToken });
      return true;
    });
  },
  vigente: (tokenHash: string) => prisma.tokenActualizacion.findFirst({
    where: { tokenHash, revocadoEn: null, venceEn: { gt: new Date() } },
  }),
  revocar: (id: string) => prisma.tokenActualizacion.update({
    where: { id }, data: { revocadoEn: new Date() },
  }),
};
