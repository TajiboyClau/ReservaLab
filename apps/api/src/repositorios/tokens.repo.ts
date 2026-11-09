import { prisma } from "../db/prisma.js";

export const tokensRepo = {
  crear: (usuarioId: string, tokenHash: string, venceEn: Date) =>
    prisma.tokenActualizacion.create({ data: { usuarioId, tokenHash, venceEn } }),
  vigente: (tokenHash: string) => prisma.tokenActualizacion.findFirst({
    where: { tokenHash, revocadoEn: null, venceEn: { gt: new Date() } },
  }),
  revocar: (id: string) => prisma.tokenActualizacion.update({
    where: { id }, data: { revocadoEn: new Date() },
  }),
};
