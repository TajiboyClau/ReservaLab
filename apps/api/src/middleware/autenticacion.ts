import type { NextFunction, Request, Response } from "express";
import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import { redis } from "../db/redis.js";
import { clavesApiRepo } from "../repositorios/claves-api.repo.js";

const accessSecret = () => process.env.JWT_ACCESS_SECRET ?? "";

export function requiereSesion(req: Request, res: Response, next: NextFunction) {
  const token = req.header("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Falta el token de acceso" });

  try {
    const payload = jwt.verify(token, accessSecret()) as jwt.JwtPayload;
    if (typeof payload.sub !== "string" || typeof payload.rol !== "string") {
      return res.status(401).json({ error: "Token inválido" });
    }
    req.auth = { usuarioId: payload.sub, rol: payload.rol };
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido o vencido" });
  }
}

export function requiereRol(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth) return res.status(401).json({ error: "Inicia sesión" });
    if (!roles.includes(req.auth.rol)) return res.status(403).json({ error: "No tienes permiso" });
    next();
  };
}

export function requiereSesionOClave(permiso: "read:spaces" | "read:now", permitirJwt = true) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const bearer = req.header("Authorization")?.replace(/^Bearer\s+/i, "");
    if (bearer && permitirJwt) {
      try {
        const payload = jwt.verify(bearer, accessSecret()) as jwt.JwtPayload;
        if (typeof payload.sub === "string" && typeof payload.rol === "string") {
          req.auth = { usuarioId: payload.sub, rol: payload.rol };
          return next();
        }
      } catch { /* Si también se envió una API key, se valida abajo. */ }
    }
    const clave = req.header("X-API-Key");
    if (!clave) return res.status(401).json({ error: "Se requiere JWT o API key" });
    const claveHash = createHash("sha256").update(clave).digest("hex");
    const registro = await clavesApiRepo.porHash(claveHash);
    if (!registro || registro.revocadaEn) return res.status(401).json({ error: "API key inválida o revocada" });
    if (!registro.permisos.includes(permiso)) return res.status(403).json({ error: "La API key no tiene ese permiso" });
    if (!redis.isReady) return res.status(503).json({ error: "El límite de solicitudes requiere Redis" });
    const limiteClave = `rate:${registro.id}:${Math.floor(Date.now() / 60000)}`;
    const cantidad = await redis.incr(limiteClave);
    if (cantidad === 1) await redis.expire(limiteClave, 60);
    res.setHeader("X-RateLimit-Limit", "60");
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, 60 - cantidad)));
    if (cantidad > 60) return res.status(429).json({ error: "Límite de 60 solicitudes por minuto excedido" });
    req.apiKeyId = registro.id;
    await clavesApiRepo.registrarUso(registro.id);
    next();
  };
}
