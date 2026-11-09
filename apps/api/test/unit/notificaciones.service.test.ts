import { afterEach, describe, expect, it, vi } from "vitest";
import { notificarReserva } from "../../src/servicios/notificaciones.service.js";

const reserva = { id: "r1", espacioId: "e1", inicio: new Date(), fin: new Date() };
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); delete process.env.NOTIFICATIONS_URL; });

describe("notificarReserva", () => {
  it("omite la solicitud si no hay URL configurada", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    await notificarReserva("confirmada", reserva);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("envía evento y datos al servicio externo", async () => {
    process.env.NOTIFICATIONS_URL = "http://localhost:3001/notifications";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal("fetch", fetchMock);
    await notificarReserva("cancelada", reserva);
    expect(fetchMock).toHaveBeenCalledWith(process.env.NOTIFICATIONS_URL, expect.objectContaining({ method: "POST" }));
  });
  it("registra respuestas fallidas sin interrumpir la reserva", async () => {
    process.env.NOTIFICATIONS_URL = "http://mockoon/notifications";
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(notificarReserva("confirmada", reserva)).resolves.toBeUndefined();
    expect(error).toHaveBeenCalled();
  });
  it("maneja caída del servicio externo", async () => {
    process.env.NOTIFICATIONS_URL = "http://mockoon/notifications";
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("sin conexión")));
    await expect(notificarReserva("confirmada", reserva)).resolves.toBeUndefined();
    expect(error).toHaveBeenCalled();
  });
});
