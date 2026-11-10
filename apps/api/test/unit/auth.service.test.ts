import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const { usuariosRepo, tokensRepo } = vi.hoisted(() => ({
  usuariosRepo: { porCorreo: vi.fn(), porId: vi.fn(), crear: vi.fn(), listar: vi.fn(), actualizar: vi.fn() },
  tokensRepo: { crear: vi.fn(), vigente: vi.fn(), revocar: vi.fn(), rotar: vi.fn() },
}));
vi.mock("../../src/repositorios/usuarios.repo.js", () => ({ usuariosRepo }));
vi.mock("../../src/repositorios/tokens.repo.js", () => ({ tokensRepo }));
import { authService } from "../../src/servicios/auth.service.js";

const usuario = { id: "user-1", nombre: "Docente", correo: "docente@test.local", contrasenaHash: "", rol: "docente", activo: true };
const accessSecret = "access-secret-for-unit-tests-0123456789";
const refreshSecret = "refresh-secret-for-unit-tests-0123456789";

beforeEach(async () => {
  vi.resetAllMocks();
  process.env.JWT_ACCESS_SECRET = accessSecret;
  process.env.JWT_REFRESH_SECRET = refreshSecret;
  usuario.contrasenaHash = await bcrypt.hash("ClaveSegura123", 4);
  usuariosRepo.porCorreo.mockResolvedValue(usuario);
  usuariosRepo.porId.mockResolvedValue(usuario);
  usuariosRepo.crear.mockImplementation(async (datos) => ({ ...usuario, ...datos, rol: "estudiante" }));
  tokensRepo.rotar.mockResolvedValue(true);
  tokensRepo.vigente.mockResolvedValue({ id: "token-row-1", usuarioId: usuario.id });
});

describe("authService", () => {
  it("lista usuarios y permite cambiar rol o estado desde administración", async () => {
    usuariosRepo.listar.mockResolvedValue([{ id: usuario.id, correo: usuario.correo }]);
    await expect(authService.listarUsuarios()).resolves.toHaveLength(1);
    usuariosRepo.actualizar.mockResolvedValue({ id: "otro", rol: "docente", activo: false });
    await expect(authService.actualizarUsuario("otro", usuario.id, { rol: "docente", activo: false })).resolves.toMatchObject({ rol: "docente", activo: false });
  });
  it("protege al último administrador de desactivarse o quitarse su rol", async () => {
    await expect(authService.actualizarUsuario(usuario.id, usuario.id, { rol: "docente" })).rejects.toMatchObject({ statusCode: 400 });
    await expect(authService.actualizarUsuario(usuario.id, usuario.id, { activo: false })).rejects.toMatchObject({ statusCode: 400 });
    usuariosRepo.porId.mockResolvedValueOnce(null);
    await expect(authService.actualizarUsuario("missing", usuario.id, { activo: false })).rejects.toMatchObject({ statusCode: 404 });
  });
  it("registra estudiantes, guarda hash de contraseña y emite tokens", async () => {
    usuariosRepo.porCorreo.mockResolvedValue(null);
    const resultado = await authService.registrar({ nombre: "Ana", correo: "ANA@test.local", contrasena: "ClaveSegura123" });
    expect(resultado.usuario.rol).toBe("estudiante");
    expect(resultado.accessToken).toBeTruthy();
    expect(resultado.refreshToken).toBeTruthy();
    expect(usuariosRepo.crear.mock.calls[0]![0].contrasenaHash).not.toBe("ClaveSegura123");
    expect(tokensRepo.crear).toHaveBeenCalled();
  });

  it("rechaza correo duplicado y entradas inválidas", async () => {
    await expect(authService.registrar({ nombre: "Ana", correo: usuario.correo, contrasena: "ClaveSegura123" })).rejects.toMatchObject({ statusCode: 409 });
    await expect(authService.registrar({ nombre: "A", correo: "no-es-correo", contrasena: "123" })).rejects.toBeDefined();
  });

  it("inicia sesión y devuelve access token corto y refresh token", async () => {
    const resultado = await authService.iniciarSesion({ correo: usuario.correo, contrasena: "ClaveSegura123" });
    expect(jwt.verify(resultado.accessToken, accessSecret)).toMatchObject({ sub: usuario.id, rol: "docente" });
    expect(jwt.verify(resultado.refreshToken, refreshSecret)).toMatchObject({ sub: usuario.id });
  });

  it("rechaza usuario inexistente, inactivo o contraseña incorrecta", async () => {
    usuariosRepo.porCorreo.mockResolvedValueOnce(null);
    await expect(authService.iniciarSesion({ correo: usuario.correo, contrasena: "x" })).rejects.toMatchObject({ statusCode: 401 });
    usuariosRepo.porCorreo.mockResolvedValueOnce({ ...usuario, activo: false });
    await expect(authService.iniciarSesion({ correo: usuario.correo, contrasena: "ClaveSegura123" })).rejects.toMatchObject({ statusCode: 401 });
    usuariosRepo.porCorreo.mockResolvedValueOnce(usuario);
    await expect(authService.iniciarSesion({ correo: usuario.correo, contrasena: "incorrecta" })).rejects.toMatchObject({ statusCode: 401 });
  });

  it("rota y revoca refresh token al renovarlo", async () => {
    const viejo = jwt.sign({}, refreshSecret, { subject: usuario.id, expiresIn: "7d" });
    const nuevos = await authService.renovar({ refreshToken: viejo });
    expect(tokensRepo.rotar).toHaveBeenCalledWith("token-row-1", expect.objectContaining({ usuarioId: usuario.id }));
    expect(jwt.verify(nuevos.accessToken, accessSecret)).toMatchObject({ sub: usuario.id });
    expect(nuevos.refreshToken).not.toBe(viejo);
  });

  it("rechaza refresh inválido, revocado o asociado a usuario inactivo", async () => {
    await expect(authService.renovar({ refreshToken: "token-inválido" })).rejects.toMatchObject({ statusCode: 401 });
    const token = jwt.sign({}, refreshSecret, { subject: usuario.id, expiresIn: "7d" });
    tokensRepo.vigente.mockResolvedValueOnce(null);
    await expect(authService.renovar({ refreshToken: token })).rejects.toMatchObject({ statusCode: 401 });
    usuariosRepo.porId.mockResolvedValueOnce({ ...usuario, activo: false });
    await expect(authService.renovar({ refreshToken: token })).rejects.toMatchObject({ statusCode: 401 });
  });

  it("revoca refresh token al cerrar sesión", async () => {
    const token = jwt.sign({}, refreshSecret, { subject: usuario.id, expiresIn: "7d" });
    await expect(authService.cerrarSesion({ refreshToken: token })).resolves.toEqual({ mensaje: "Sesión cerrada" });
    expect(tokensRepo.revocar).toHaveBeenCalledWith("token-row-1");
  });
});
