import { z } from "zod";
import { crearReservaSchema } from "@reservalab/shared";
import { reservasRepo } from "../repositorios/reservas.repo.js";
import { invalidarDisponibilidad } from "../db/redis.js";
import { notificarReserva } from "./notificaciones.service.js";
import { horariosRepo } from "../repositorios/horarios.repo.js";

const zonaGuatemala = "America/Guatemala";
function fechaLocal(fecha: Date) {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: zonaGuatemala, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(fecha);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)!.value;
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}
function horaLocal(fecha: Date) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: zonaGuatemala, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(fecha);
}
const horaHorario = (fecha: Date) => fecha.toISOString().slice(11, 16);

export const reservasService = {
  async crear(usuarioId: string, entrada: unknown) {
    const datos = crearReservaSchema.parse(entrada);
    if (datos.fin <= datos.inicio) throw Object.assign(new Error("La hora final debe ser posterior a la inicial"), { statusCode: 400 });
    const espacio = await reservasRepo.espacio(datos.espacioId);
    if (!espacio || !espacio.activo) throw Object.assign(new Error("Espacio no encontrado o inactivo"), { statusCode: 404 });
    const fechaInicio = fechaLocal(datos.inicio);
    if (fechaInicio !== fechaLocal(new Date(datos.fin.getTime() - 1))) throw Object.assign(new Error("La reserva debe iniciar y finalizar el mismo día local"), { statusCode: 400 });
    const dia = new Date(`${fechaInicio}T12:00:00-06:00`).getUTCDay() || 7;
    const horarios = await horariosRepo.deDia(datos.espacioId, dia);
    const dentroDeHorario = horarios.some((horario) => horaLocal(datos.inicio) >= horaHorario(horario.horaInicio) && horaLocal(datos.fin) <= horaHorario(horario.horaFin));
    if (!dentroDeHorario) throw Object.assign(new Error("La reserva debe estar dentro de un horario habilitado para ese día"), { statusCode: 400 });
    if (await reservasRepo.traslape(datos.espacioId, datos.inicio, datos.fin)) {
      throw Object.assign(new Error("El espacio ya está reservado en ese horario"), { statusCode: 409 });
    }
    try {
      const reserva = await reservasRepo.crear({ ...datos, usuarioId });
      await invalidarDisponibilidad(reserva.espacioId);
      await notificarReserva("confirmada", reserva);
      return reserva;
    } catch (error) {
      const detalle = error instanceof Error ? error.message : "";
      if (detalle.includes("reservas_sin_traslape") || detalle.includes("23P01")) {
        throw Object.assign(new Error("El espacio ya está reservado en ese horario"), { statusCode: 409 });
      }
      throw error;
    }
  },
  propias(usuarioId: string) { return reservasRepo.propias(usuarioId); },
  async cancelar(id: string, usuarioId: string, rol: string) {
    const reserva = await reservasRepo.porId(id);
    if (!reserva) throw Object.assign(new Error("Reserva no encontrada"), { statusCode: 404 });
    if (reserva.estado !== "activa") throw Object.assign(new Error("La reserva ya está cancelada"), { statusCode: 409 });
    if (reserva.usuarioId !== usuarioId && rol !== "administrador") {
      throw Object.assign(new Error("Solo el dueño o un administrador puede cancelar la reserva"), { statusCode: 403 });
    }
    const cancelada = await reservasRepo.cancelar(id);
    await invalidarDisponibilidad(cancelada.espacioId);
    await notificarReserva("cancelada", cancelada);
    return cancelada;
  },
  async disponibilidad(espacioId: string, fechaEntrada: unknown) {
    const fecha = z.iso.date().parse(fechaEntrada);
    // El calendario de la facultad usa la hora local de Guatemala (UTC-6).
    const inicio = new Date(`${fecha}T00:00:00.000-06:00`);
    const fin = new Date(inicio);
    fin.setUTCDate(fin.getUTCDate() + 1);
    const espacio = await reservasRepo.espacio(espacioId);
    if (!espacio || !espacio.activo) throw Object.assign(new Error("Espacio no encontrado o inactivo"), { statusCode: 404 });
    const reservas = await reservasRepo.porEspacioYDia(espacioId, inicio, fin);
    const bloques: Array<{ estado: "libre" | "ocupado"; inicio: Date; fin: Date }> = [];
    const dia = new Date(`${fecha}T12:00:00-06:00`).getUTCDay() || 7;
    const horarios = await horariosRepo.deDia(espacioId, dia);
    for (const horario of horarios) {
      const apertura = new Date(`${fecha}T${horaHorario(horario.horaInicio)}:00-06:00`);
      const cierre = new Date(`${fecha}T${horaHorario(horario.horaFin)}:00-06:00`);
      let cursor = apertura;
      for (const reserva of reservas.filter((r) => r.inicio < cierre && r.fin > apertura)) {
        const bloqueInicio = reserva.inicio < apertura ? apertura : reserva.inicio;
        const bloqueFin = reserva.fin > cierre ? cierre : reserva.fin;
        if (bloqueInicio > cursor) bloques.push({ estado: "libre", inicio: cursor, fin: bloqueInicio });
        if (bloqueFin > bloqueInicio) bloques.push({ estado: "ocupado", inicio: bloqueInicio, fin: bloqueFin });
        if (bloqueFin > cursor) cursor = bloqueFin;
      }
      if (cursor < cierre) bloques.push({ estado: "libre", inicio: cursor, fin: cierre });
    }
    bloques.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
    return { espacioId, fecha, bloques, reservas };
  },
};
