export async function notificarReserva(evento: "confirmada" | "cancelada", reserva: { id: string; espacioId: string; inicio: Date; fin: Date }) {
  const url = process.env.NOTIFICATIONS_URL;
  if (!url) return;
  try {
    const respuesta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evento: `reserva_${evento}`, reserva }),
      signal: AbortSignal.timeout(3000),
    });
    if (!respuesta.ok) console.error(`Mockoon respondió ${respuesta.status} al notificar reserva ${reserva.id}`);
  } catch (error) {
    console.error("No se pudo notificar al servicio externo:", error);
  }
}
