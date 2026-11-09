import { beforeEach, describe, expect, it, vi } from "vitest";

const { repo } = vi.hoisted(() => ({ repo: { listar: vi.fn(), porId: vi.fn(), crear: vi.fn(), actualizar: vi.fn(), desactivar: vi.fn() } }));
vi.mock("../../src/repositorios/espacios.repo.js", () => ({ espaciosRepo: repo }));
import { espaciosService } from "../../src/servicios/espacios.service.js";

const id = "10000000-0000-4000-8000-000000000001";
const datos = { nombre: "Lab 1", edificio: "Ingeniería", tipo: "laboratorio", capacidad: 20 };
beforeEach(() => { vi.resetAllMocks(); repo.porId.mockResolvedValue({ id, activo: true }); });

describe("espaciosService", () => {
  it("lista aplicando filtros opcionales", async () => {
    repo.listar.mockResolvedValue([]);
    await espaciosService.listar({ edificio: "Central", capacidad: "20" });
    expect(repo.listar).toHaveBeenCalledWith({ edificio: "Central", capacidad: 20 });
  });
  it("rechaza capacidad inválida", async () => {
    expect(() => espaciosService.listar({ capacidad: "cero" })).toThrow();
  });
  it("valida y crea espacio", async () => {
    repo.crear.mockResolvedValue({ id });
    await espaciosService.crear(datos);
    expect(repo.crear).toHaveBeenCalledWith({ ...datos, descripcion: undefined });
  });
  it("valida actualizaciones y exige al menos un campo", async () => {
    await expect(espaciosService.actualizar(id, {})).rejects.toMatchObject({ statusCode: 400 });
    repo.actualizar.mockResolvedValue({ id, nombre: "Nuevo" });
    await espaciosService.actualizar(id, { nombre: "Nuevo" });
    expect(repo.actualizar).toHaveBeenCalledWith(id, { nombre: "Nuevo" });
  });
  it("no actualiza ni elimina espacios inexistentes o inactivos", async () => {
    repo.porId.mockResolvedValueOnce(null);
    await expect(espaciosService.actualizar(id, { nombre: "X" })).rejects.toMatchObject({ statusCode: 404 });
    repo.porId.mockResolvedValueOnce({ id, activo: false });
    await expect(espaciosService.eliminar(id)).rejects.toMatchObject({ statusCode: 404 });
  });
  it("desactiva el espacio en vez de borrarlo", async () => {
    repo.desactivar.mockResolvedValue({ id, activo: false });
    await expect(espaciosService.eliminar(id)).resolves.toEqual({ mensaje: "Espacio desactivado" });
    expect(repo.desactivar).toHaveBeenCalledWith(id);
  });
});
