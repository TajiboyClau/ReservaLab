import { beforeEach, describe, expect, it, vi } from "vitest";

const { espaciosRepo, horariosRepo, invalidar } = vi.hoisted(() => ({
  espaciosRepo: { porId: vi.fn() },
  horariosRepo: { deEspacio: vi.fn(), deDia: vi.fn(), crear: vi.fn(), eliminar: vi.fn() },
  invalidar: vi.fn(),
}));
vi.mock("../../src/repositorios/espacios.repo.js", () => ({ espaciosRepo }));
vi.mock("../../src/repositorios/horarios.repo.js", () => ({ horariosRepo }));
vi.mock("../../src/db/redis.js", () => ({ invalidarDisponibilidad: invalidar }));
import { horariosService } from "../../src/servicios/horarios.service.js";

const espacioId = "10000000-0000-4000-8000-000000000001";
const turno = (hora: string) => new Date(`1970-01-01T${hora}:00.000Z`);
beforeEach(() => {
  vi.resetAllMocks();
  espaciosRepo.porId.mockResolvedValue({ id: espacioId, activo: true });
  horariosRepo.deDia.mockResolvedValue([]);
  horariosRepo.crear.mockResolvedValue({ id: "horario-1", diaSemana: 1, horaInicio: turno("07:00"), horaFin: turno("12:00") });
  horariosRepo.eliminar.mockResolvedValue({ count: 1 });
});

describe("horariosService", () => {
  it("lista los horarios con formato HH:mm", async () => {
    horariosRepo.deEspacio.mockResolvedValue([{ id: "h1", diaSemana: 1, horaInicio: turno("07:00"), horaFin: turno("12:00") }]);
    await expect(horariosService.listar(espacioId)).resolves.toEqual([{ id: "h1", diaSemana: 1, horaInicio: "07:00", horaFin: "12:00" }]);
  });
  it("crea un horario semanal y limpia la disponibilidad en caché", async () => {
    await expect(horariosService.crear(espacioId, { diaSemana: 1, horaInicio: "07:00", horaFin: "12:00" })).resolves.toMatchObject({ diaSemana: 1, horaInicio: "07:00", horaFin: "12:00" });
    expect(invalidar).toHaveBeenCalledWith(espacioId);
  });
  it("rechaza horas inválidas, invertidas y traslapadas", async () => {
    await expect(horariosService.crear(espacioId, { diaSemana: 8, horaInicio: "07:00", horaFin: "12:00" })).rejects.toBeDefined();
    await expect(horariosService.crear(espacioId, { diaSemana: 1, horaInicio: "13:00", horaFin: "12:00" })).rejects.toMatchObject({ statusCode: 400 });
    horariosRepo.deDia.mockResolvedValue([{ horaInicio: turno("09:00"), horaFin: turno("12:00") }]);
    await expect(horariosService.crear(espacioId, { diaSemana: 1, horaInicio: "11:00", horaFin: "14:00" })).rejects.toMatchObject({ statusCode: 409 });
  });
  it("elimina solo el horario del espacio y avisa si no existe", async () => {
    await expect(horariosService.eliminar(espacioId, "h1")).resolves.toEqual({ mensaje: "Horario eliminado" });
    expect(horariosRepo.eliminar).toHaveBeenCalledWith(espacioId, "h1");
    horariosRepo.eliminar.mockResolvedValueOnce({ count: 0 });
    await expect(horariosService.eliminar(espacioId, "missing")).rejects.toMatchObject({ statusCode: 404 });
  });
});
