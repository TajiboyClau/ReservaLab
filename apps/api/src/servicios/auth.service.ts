import { createHash, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { tokensRepo } from "../repositorios/tokens.repo.js";
import { usuariosRepo } from "../repositorios/usuarios.repo.js";

const registroSchema = z.object({
  nombre: z.string().trim().min(2).max(120),
  correo: z.email().transform((valor) => valor.trim().toLowerCase()),
  contrasena: z.string().min(8).max(100),
});
const loginSchema = z.object({ correo: z.email(), contrasena: z.string().min(1) });
const hash = (valor: string) => createHash("sha256").update(valor).digest("hex");
const accessSecret = () => process.env.JWT_ACCESS_SECRET || "";
const refreshSecret = () => process.env.JWT_REFRESH_SECRET || "";

function emitir(usuario: { id: string; rol: string }) {
  const accessToken = jwt.sign({ rol: usuario.rol }, accessSecret(), { subject: usuario.id, expiresIn: "15m" });
  const refreshToken = jwt.sign({}, refreshSecret(), { subject: usuario.id, expiresIn: "7d", jwtid: randomUUID() });
  return { accessToken, refreshToken };
}

function datosRefresh(usuarioId: string, token: string) {
  const datos = jwt.decode(token) as jwt.JwtPayload;
  return { usuarioId, tokenHash: hash(token), venceEn: new Date((datos.exp ?? 0) * 1000) };
}

async function guardarRefresh(usuarioId: string, token: string) {
  const { tokenHash, venceEn } = datosRefresh(usuarioId, token);
  await tokensRepo.crear(usuarioId, tokenHash, venceEn);
}

export const authService = {
  async listarUsuarios() { return usuariosRepo.listar(); },
  async actualizarUsuario(id: string, solicitanteId: string, entrada: unknown) {
    const datos = z.object({ rol: z.enum(["estudiante", "docente", "administrador"]).optional(), activo: z.boolean().optional() }).refine((valor) => Object.keys(valor).length > 0, "Indica el rol o el estado del usuario").parse(entrada);
    const existente = await usuariosRepo.porId(id);
    if (!existente) throw Object.assign(new Error("Usuario no encontrado"), { statusCode: 404 });
    if (id === solicitanteId && (datos.activo === false || datos.rol && datos.rol !== "administrador")) {
      throw Object.assign(new Error("No puedes desactivar o quitarte el rol de administrador"), { statusCode: 400 });
    }
    return usuariosRepo.actualizar(id, datos);
  },
  async registrar(entrada: unknown) {
    const datos = registroSchema.parse(entrada);
    if (await usuariosRepo.porCorreo(datos.correo)) throw Object.assign(new Error("Ese correo ya está registrado"), { statusCode: 409 });
    const contrasenaHash = await bcrypt.hash(datos.contrasena, 12);
    const usuario = await usuariosRepo.crear({ nombre: datos.nombre, correo: datos.correo, contrasenaHash });
    const tokens = emitir(usuario);
    await guardarRefresh(usuario.id, tokens.refreshToken);
    return { usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol }, ...tokens };
  },

  async iniciarSesion(entrada: unknown) {
    const datos = loginSchema.parse(entrada);
    const usuario = await usuariosRepo.porCorreo(datos.correo.trim().toLowerCase());
    if (!usuario || !usuario.activo || !(await bcrypt.compare(datos.contrasena, usuario.contrasenaHash))) {
      throw Object.assign(new Error("Correo o contraseña incorrectos"), { statusCode: 401 });
    }
    const tokens = emitir(usuario);
    await guardarRefresh(usuario.id, tokens.refreshToken);
    return { usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol }, ...tokens };
  },

  async renovar(entrada: unknown) {
    const { refreshToken } = z.object({ refreshToken: z.string().min(1) }).parse(entrada);
    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(refreshToken, refreshSecret()) as jwt.JwtPayload;
    } catch {
      throw Object.assign(new Error("Refresh token inválido o vencido"), { statusCode: 401 });
    }
    const sesion = await tokensRepo.vigente(hash(refreshToken));
    if (!sesion || sesion.usuarioId !== payload.sub) throw Object.assign(new Error("Sesión revocada o vencida"), { statusCode: 401 });
    const usuario = await usuariosRepo.porId(sesion.usuarioId);
    if (!usuario || !usuario.activo) throw Object.assign(new Error("La cuenta no está disponible"), { statusCode: 401 });
    const tokens = emitir(usuario);
    const rotado = await tokensRepo.rotar(sesion.id, datosRefresh(usuario.id, tokens.refreshToken));
    if (!rotado) throw Object.assign(new Error("Sesión revocada o vencida"), { statusCode: 401 });
    return tokens;
  },

  async cerrarSesion(entrada: unknown) {
    const { refreshToken } = z.object({ refreshToken: z.string().min(1) }).parse(entrada);
    const sesion = await tokensRepo.vigente(hash(refreshToken));
    if (sesion) await tokensRepo.revocar(sesion.id);
    return { mensaje: "Sesión cerrada" };
  },
};
