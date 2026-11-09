import { beforeEach, describe, expect, it, vi } from "vitest";

const { repo } = vi.hoisted(() => ({ repo: { porHash: vi.fn(), porId: vi.fn(), crear: vi.fn(), listar: vi.fn(), revocar: vi.fn() } }));
vi.mock("../../src/repositorios/claves-api.repo.js", () => ({ clavesApiRepo: repo }));
import { clavesApiService } from "../../src/servicios/claves-api.service.js";

beforeEach(() => { vi.resetAllMocks(); repo.crear.mockImplementation(async (dato) => ({ id: "key-1", ...dato })); repo.porId.mockResolvedValue({ id: "key-1", revocadaEn: null }); });

describe("clavesApiService", () => {
  it("emite clave aleatoria de una sola vista y persiste solo su hash", async () => {
    const resultado = await clavesApiService.crear({ nombre: "Pantalla", permisos: ["read:now"] });
    expect(resultado.clave).toMatch(/^rl_live_[a-f0-9]{64}$/);
    expect(repo.crear.mock.calls[0]![0].claveHash).not.toBe(resultado.clave);
    expect(resultado.permisos).toEqual(["read:now"]);
  });
  it("rechaza permisos desconocidos", async () => {
    await expect(clavesApiService.crear({ nombre: "X", permisos: ["write:everything"] })).rejects.toBeDefined();
  });
  it("lista las claves usando el repositorio", async () => {
    repo.listar.mockResolvedValue([]);
    await expect(clavesApiService.listar()).resolves.toEqual([]);
  });
  it("revoca claves vigentes y rechaza inexistentes o ya revocadas", async () => {
    repo.revocar.mockResolvedValue({ id: "key-1" });
    await expect(clavesApiService.revocar("key-1")).resolves.toEqual({ id: "key-1" });
    repo.porId.mockResolvedValueOnce(null);
    await expect(clavesApiService.revocar("missing")).rejects.toMatchObject({ statusCode: 404 });
    repo.porId.mockResolvedValueOnce({ id: "key-1", revocadaEn: new Date() });
    await expect(clavesApiService.revocar("key-1")).rejects.toMatchObject({ statusCode: 409 });
  });
});
