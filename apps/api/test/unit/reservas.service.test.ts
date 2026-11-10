import { beforeEach, describe, expect, it, vi } from "vitest";

const { repo, repoHorarios, invalidar, notificar } = vi.hoisted(() => ({
  repo: {
    espacio: vi.fn(), traslape: vi.fn(), crear: vi.fn(), propias: vi.fn(),
    porId: vi.fn(), cancelar: vi.fn(), porEspacioYDia: vi.fn(),
  },
  repoHorarios: { deDia: vi.fn() },
  invalidar: vi.fn(),
  notificar: vi.fn(),
}));
vi.mock("../../src/repositorios/reservas.repo.js", () => ({ reservasRepo: repo }));
vi.mock("../../src/db/redis.js", () => ({ invalidarDisponibilidad: invalidar }));
vi.mock("../../src/servicios/notificaciones.service.js", () => ({ notificarReserva: notificar }));
vi.mock("../../src/repositorios/horarios.repo.js", () => ({ horariosRepo: repoHorarios }));

import { reservasService } from "../../src/servicios/reservas.service.js";

const espacio = { id: "10000000-0000-4000-8000-000000000001", activo: true };
const inicio = new Date("2026-11-09T14:00:00Z");
const fin = new Date("2026-11-09T15:00:00Z");
const entrada = { espacioId: espacio.id, proposito: "Práctica", inicio: inicio.toISOString(), fin: fin.toISOString() };

beforeEach(() => {
  vi.resetAllMocks();
  repo.espacio.mockResolvedValue(espacio);
  repo.traslape.mockResolvedValue(null);
  repo.crear.mockResolvedValue({ id: "reserva-1", espacioId: espacio.id, inicio, fin });
  repo.porId.mockResolvedValue({ id: "reserva-1", espacioId: espacio.id, usuarioId: "user-1", estado: "activa", inicio, fin });
  repo.cancelar.mockResolvedValue({ id: "reserva-1", espacioId: espacio.id, inicio, fin });
  repo.porEspacioYDia.mockResolvedValue([]);
  repoHorarios.deDia.mockResolvedValue([{ horaInicio: new Date("1970-01-01T07:00:00Z"), horaFin: new Date("1970-01-01T22:00:00Z") }]);
});

describe("reservasService", () => {
  it("rechaza un fin anterior al inicio", async () => {
    await expect(reservasService.crear("user-1", { ...entrada, fin: inicio.toISOString() })).rejects.toMatchObject({ statusCode: 400 });
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it.each(["2026-11-09T22:00:59-06:00", "2026-11-10T00:00:00-06:00"])(
    "rechaza una reserva que termina fuera de horario (%s)",
    async (finFueraDeHorario) => {
      await expect(reservasService.crear("user-1", { ...entrada, fin: finFueraDeHorario }))
        .rejects.toMatchObject({ statusCode: 400 });
      expect(repo.crear).not.toHaveBeenCalled();
    },
  );

  it("acepta una reserva que termina exactamente al cierre", async () => {
    await expect(reservasService.crear("user-1", { ...entrada, fin: "2026-11-09T22:00:00-06:00" }))
      .resolves.toMatchObject({ id: "reserva-1" });
  });

  it("rechaza espacios inexistentes o inactivos", async () => {
    repo.espacio.mockResolvedValueOnce(null);
    await expect(reservasService.crear("user-1", entrada)).rejects.toMatchObject({ statusCode: 404 });
    repo.espacio.mockResolvedValueOnce({ ...espacio, activo: false });
    await expect(reservasService.crear("user-1", entrada)).rejects.toMatchObject({ statusCode: 404 });
  });

  it("rechaza una reserva que ya se traslapa", async () => {
    repo.traslape.mockResolvedValue({ id: "otra" });
    await expect(reservasService.crear("user-1", entrada)).rejects.toMatchObject({ statusCode: 409 });
    expect(repo.crear).not.toHaveBeenCalled();
  });

  it("crea una reserva, invalida disponibilidad y notifica", async () => {
    const resultado = await reservasService.crear("user-1", entrada);
    expect(resultado.id).toBe("reserva-1");
    expect(invalidar).toHaveBeenCalledWith(espacio.id);
    expect(notificar).toHaveBeenCalledWith("confirmada", resultado);
  });

  it("convierte el rechazo concurrente de PostgreSQL en 409", async () => {
    repo.crear.mockRejectedValue(new Error("23P01 reservas_sin_traslape"));
    await expect(reservasService.crear("user-1", entrada)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("propaga fallos de base de datos no relacionados con traslapes", async () => {
    repo.crear.mockRejectedValue(new Error("conexión perdida"));
    await expect(reservasService.crear("user-1", entrada)).rejects.toThrow("conexión perdida");
  });

  it("lista las reservas propias", async () => {
    repo.propias.mockResolvedValue([{ id: "reserva-1" }]);
    await expect(reservasService.propias("user-1")).resolves.toEqual([{ id: "reserva-1" }]);
  });

  it("permite cancelar al dueño o administrador y actualiza efectos", async () => {
    await reservasService.cancelar("reserva-1", "user-1", "docente");
    expect(repo.cancelar).toHaveBeenCalledWith("reserva-1");
    expect(invalidar).toHaveBeenCalledWith(espacio.id);
    expect(notificar).toHaveBeenCalledWith("cancelada", expect.anything());
    repo.porId.mockResolvedValueOnce({ id: "reserva-1", espacioId: espacio.id, usuarioId: "otro", estado: "activa" });
    await expect(reservasService.cancelar("reserva-1", "admin", "administrador")).resolves.toBeDefined();
  });

  it("rechaza cancelaciones sin dueño, inexistentes o ya canceladas", async () => {
    repo.porId.mockResolvedValueOnce(null);
    await expect(reservasService.cancelar("x", "user-1", "docente")).rejects.toMatchObject({ statusCode: 404 });
    repo.porId.mockResolvedValueOnce({ id: "x", estado: "cancelada" });
    await expect(reservasService.cancelar("x", "user-1", "docente")).rejects.toMatchObject({ statusCode: 409 });
    repo.porId.mockResolvedValueOnce({ id: "x", usuarioId: "otro", estado: "activa" });
    await expect(reservasService.cancelar("x", "user-1", "estudiante")).rejects.toMatchObject({ statusCode: 403 });
  });

  it("devuelve bloques libres y ocupados del día", async () => {
    repo.porEspacioYDia.mockResolvedValue([{ inicio: new Date("2026-11-09T15:00:00Z"), fin: new Date("2026-11-09T16:00:00Z"), id: "r", estado: "activa" }]);
    const resultado = await reservasService.disponibilidad(espacio.id, "2026-11-09");
    expect(resultado.bloques.map((bloque) => bloque.estado)).toEqual(["libre", "ocupado", "libre"]);
  });

  it("rechaza fecha inválida y espacio no disponible en consulta", async () => {
    await expect(reservasService.disponibilidad(espacio.id, "mañana")).rejects.toBeDefined();
    repo.espacio.mockResolvedValueOnce(null);
    await expect(reservasService.disponibilidad(espacio.id, "2026-11-09")).rejects.toMatchObject({ statusCode: 404 });
  });
});
