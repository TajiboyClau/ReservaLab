import { horarioDisponibleSchema } from "@reservalab/shared";
import { espaciosRepo } from "../repositorios/espacios.repo.js";
import { horariosRepo } from "../repositorios/horarios.repo.js";
import { invalidarDisponibilidad } from "../db/redis.js";

const fechaHora = (hora: string) => new Date(`1970-01-01T${hora}:00.000Z`);
const horaTexto = (fecha: Date) => fecha.toISOString().slice(11, 16);

export const horariosService = {
  async listar(espacioId: string) {
    const espacio = await espaciosRepo.porId(espacioId);
    if (!espacio || !espacio.activo) throw Object.assign(new Error("Espacio no encontrado"), { statusCode: 404 });
    const horarios = await horariosRepo.deEspacio(espacioId);
    return horarios.map(({ id, diaSemana, horaInicio, horaFin }) => ({ id, diaSemana, horaInicio: horaTexto(horaInicio), horaFin: horaTexto(horaFin) }));
  },
  async crear(espacioId: string, entrada: unknown) {
    const datos = horarioDisponibleSchema.parse(entrada);
    if (datos.horaFin <= datos.horaInicio) throw Object.assign(new Error("La hora final debe ser posterior a la inicial"), { statusCode: 400 });
    const espacio = await espaciosRepo.porId(espacioId);
    if (!espacio || !espacio.activo) throw Object.assign(new Error("Espacio no encontrado"), { statusCode: 404 });
    const existentes = await horariosRepo.deDia(espacioId, datos.diaSemana);
    if (existentes.some((h) => datos.horaInicio < horaTexto(h.horaFin) && datos.horaFin > horaTexto(h.horaInicio))) {
      throw Object.assign(new Error("El horario se traslapa con otro horario del espacio"), { statusCode: 409 });
    }
    const creado = await horariosRepo.crear({ espacioId, diaSemana: datos.diaSemana, horaInicio: fechaHora(datos.horaInicio), horaFin: fechaHora(datos.horaFin) });
    await invalidarDisponibilidad(espacioId);
    return { id: creado.id, diaSemana: creado.diaSemana, horaInicio: datos.horaInicio, horaFin: datos.horaFin };
  },
  async eliminar(espacioId: string, id: string) {
    const resultado = await horariosRepo.eliminar(espacioId, id);
    if (!resultado.count) throw Object.assign(new Error("Horario no encontrado"), { statusCode: 404 });
    await invalidarDisponibilidad(espacioId);
    return { mensaje: "Horario eliminado" };
  },
};
