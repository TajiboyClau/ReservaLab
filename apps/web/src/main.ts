import "./style.css";
import type { BloqueDisponibilidad } from "@reservalab/shared";

type Usuario = { id: string; nombre: string; correo: string; rol: string };
type Reserva = { id: string; espacioId: string; proposito: string; inicio: string; fin: string; estado: string; espacio: { nombre: string; edificio: string } };
type Espacio = { id: string; nombre: string; edificio: string; capacidad: number; tipo: string };
type Ocupacion = Espacio & { ocupado: boolean; reservaActual: { grupo?: string | null; proposito: string } | null };

let accessToken = "";
let refreshToken = "";
let espacios: Espacio[] = [];
let claveApi = "";
const intervaloOcupacion = 30_000;
let proximaConsulta = 0;

const el = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const api = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(`/api/v1${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? `Error ${response.status}`);
  return data as T;
};

function setMessage(selector: string, message: string, ok = false) {
  const node = el<HTMLElement>(selector);
  node.textContent = message;
  node.classList.toggle("success", ok);
}

function fechaLocalActual() {
  const ahora = new Date();
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;
}

function horaGuatemala(valor: string) {
  return new Intl.DateTimeFormat("es-GT", { timeZone: "America/Guatemala", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(valor));
}

async function cargarDisponibilidad() {
  const id = el<HTMLSelectElement>("#space-select").value;
  const fecha = el<HTMLInputElement>("#reservation-date").value;
  const lista = el<HTMLElement>("#availability-blocks");
  if (!id || !fecha) {
    lista.replaceChildren(Object.assign(document.createElement("li"), { className: "muted", textContent: "Selecciona espacio y fecha para consultar." }));
    return;
  }
  try {
    const datos = await api<{ bloques: BloqueDisponibilidad[] }>(`/spaces/${id}/availability?date=${fecha}`);
    lista.replaceChildren();
    for (const bloque of datos.bloques) {
      const fila = document.createElement("li");
      const estado = document.createElement("span");
      estado.className = `availability-state ${bloque.estado}`;
      estado.textContent = bloque.estado === "libre" ? "Libre" : "Ocupado";
      const horario = document.createElement("span");
      horario.textContent = `${horaGuatemala(bloque.inicio)} – ${horaGuatemala(bloque.fin)}`;
      fila.append(estado, horario);
      lista.append(fila);
    }
    if (!datos.bloques.length) lista.textContent = "No hay bloques disponibles.";
  } catch (error) {
    lista.replaceChildren(Object.assign(document.createElement("li"), { className: "muted", textContent: (error as Error).message }));
  }
}

function mostrarSesion(usuario?: Usuario) {
  el<HTMLElement>("#login-card").classList.toggle("hidden", Boolean(usuario));
  el<HTMLElement>("#reservation-dashboard").classList.toggle("hidden", !usuario);
  el<HTMLElement>("#session-status").textContent = usuario ? `${usuario.nombre} · ${usuario.rol}` : "Sin sesión";
}

async function cargarEspacios() {
  espacios = await api<Espacio[]>("/spaces");
  const select = el<HTMLSelectElement>("#space-select");
  select.replaceChildren(new Option("Selecciona un espacio", ""));
  for (const espacio of espacios) select.add(new Option(`${espacio.edificio} · ${espacio.nombre} (${espacio.capacidad})`, espacio.id));
}

async function cargarReservas() {
  const lista = el<HTMLElement>("#my-reservations");
  const reservas = await api<Reserva[]>("/reservations/me");
  lista.replaceChildren();
  if (!reservas.length) { lista.textContent = "Aún no tienes reservas."; lista.className = "reservation-list muted"; return; }
  lista.className = "reservation-list";
  for (const reserva of reservas) {
    const fila = document.createElement("article"); fila.className = "reservation-item";
    const datos = document.createElement("div");
    const nombre = document.createElement("div"); nombre.className = "reservation-name"; nombre.textContent = reserva.espacio.nombre;
    const detalle = document.createElement("div"); detalle.className = "reservation-detail";
    detalle.textContent = `${reserva.espacio.edificio} · ${new Date(reserva.inicio).toLocaleString("es-GT")} · ${reserva.proposito}`;
    datos.append(nombre, detalle); fila.append(datos);
    if (reserva.estado === "activa") {
      const cancelar = document.createElement("button"); cancelar.className = "cancel-button"; cancelar.textContent = "Cancelar";
      cancelar.addEventListener("click", async () => {
        try { await api(`/reservations/${reserva.id}`, { method: "DELETE" }); await cargarReservas(); }
        catch (error) { setMessage("#reservation-message", (error as Error).message); }
      }); fila.append(cancelar);
    }
    lista.append(fila);
  }
}

el<HTMLFormElement>("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const formulario = new FormData(event.currentTarget as HTMLFormElement);
  try {
    const resultado = await api<{ usuario: Usuario; accessToken: string; refreshToken: string }>("/auth/login", {
      method: "POST", body: JSON.stringify({ correo: formulario.get("correo"), contrasena: formulario.get("contrasena") }),
    });
    accessToken = resultado.accessToken; refreshToken = resultado.refreshToken;
    mostrarSesion(resultado.usuario); await cargarEspacios(); await cargarReservas();
    setMessage("#login-message", "Sesión iniciada", true);
  } catch (error) { setMessage("#login-message", (error as Error).message); }
});

el<HTMLButtonElement>("#logout-button").addEventListener("click", async () => {
  try { await api("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken }) }); } catch { /* la sesión local igual se descarta */ }
  accessToken = ""; refreshToken = ""; mostrarSesion();
  el<HTMLElement>("#my-reservations").textContent = "Inicia sesión para ver tus reservas.";
});

el<HTMLInputElement>("#reservation-date").value = fechaLocalActual();
el<HTMLFormElement>("#reservation-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget as HTMLFormElement);
  const fecha = String(form.get("fecha"));
  const offset = "-06:00";
  const horaInicio = String(form.get("inicio")); const horaFin = String(form.get("fin"));
  try {
    await api("/reservations", { method: "POST", body: JSON.stringify({
      espacioId: form.get("espacioId"), grupo: form.get("grupo") || undefined,
      proposito: form.get("proposito"), inicio: `${fecha}T${horaInicio}:00${offset}`, fin: `${fecha}T${horaFin}:00${offset}`,
    }) });
    setMessage("#reservation-message", "Reserva creada correctamente.", true); await cargarReservas(); await cargarDisponibilidad();
  } catch (error) { setMessage("#reservation-message", (error as Error).message); }
});

el<HTMLButtonElement>("#refresh-reservations").addEventListener("click", () => void cargarReservas());
el<HTMLSelectElement>("#space-select").addEventListener("change", () => void cargarDisponibilidad());
el<HTMLInputElement>("#reservation-date").addEventListener("change", () => void cargarDisponibilidad());

document.querySelectorAll<HTMLButtonElement>(".nav-button").forEach((boton) => boton.addEventListener("click", () => {
  document.querySelectorAll(".nav-button").forEach((item) => item.classList.remove("active")); boton.classList.add("active");
  const reservasVista = boton.dataset.view === "reservas";
  el<HTMLElement>("#view-reservas").classList.toggle("hidden", !reservasVista);
  el<HTMLElement>("#view-ocupacion").classList.toggle("hidden", reservasVista);
  if (!reservasVista && claveApi) void cargarOcupacion();
}));

async function cargarOcupacion() {
  if (!claveApi) return;
  proximaConsulta = 0;
  el<HTMLElement>("#occupancy-countdown").textContent = " · Actualizando…";
  const cuerpo = el<HTMLElement>("#occupancy-table");
  try {
    const respuesta = await fetch("/api/v1/now", { headers: { "X-API-Key": claveApi } });
    const datos = await respuesta.json() as Ocupacion[] | { error: string };
    if (!respuesta.ok) throw new Error("error" in datos ? datos.error : "No se pudo consultar la ocupación");
    cuerpo.replaceChildren();
    for (const espacio of datos as Ocupacion[]) {
      const fila = document.createElement("tr");
      const columnas = [espacio.edificio, espacio.nombre, String(espacio.capacidad)];
      for (const texto of columnas) { const td = document.createElement("td"); td.textContent = texto; fila.append(td); }
      const estado = document.createElement("td"); const insignia = document.createElement("span");
      insignia.className = `status-pill ${espacio.ocupado ? "occupied" : "free"}`; insignia.textContent = espacio.ocupado ? "Ocupado" : "Libre"; estado.append(insignia); fila.append(estado);
      const actividad = document.createElement("td"); actividad.textContent = espacio.reservaActual?.grupo || espacio.reservaActual?.proposito || "—"; fila.append(actividad);
      cuerpo.append(fila);
    }
    setMessage("#occupancy-message", "Ocupación actualizada.", true);
    return true;
  } catch (error) {
    setMessage("#occupancy-message", (error as Error).message);
  } finally {
    proximaConsulta = Date.now() + intervaloOcupacion;
    actualizarContadorOcupacion();
  }
}

const formularioClave = el<HTMLFormElement>("#api-key-form");
const campoClave = el<HTMLInputElement>("#api-key-input");
const botonCambiarClave = el<HTMLButtonElement>("#show-api-key-form");

formularioClave.addEventListener("submit", async (event) => {
  event.preventDefault();
  claveApi = campoClave.value.trim();
  if (await cargarOcupacion()) {
    formularioClave.reset();
    formularioClave.classList.add("hidden");
    botonCambiarClave.classList.remove("hidden");
    botonCambiarClave.focus();
  }
});

botonCambiarClave.addEventListener("click", () => {
  botonCambiarClave.classList.add("hidden");
  formularioClave.classList.remove("hidden");
  campoClave.focus();
});
function actualizarContadorOcupacion() {
  if (!proximaConsulta || el<HTMLElement>("#view-ocupacion").classList.contains("hidden")) return;
  const segundos = Math.ceil((proximaConsulta - Date.now()) / 1000);
  if (segundos <= 0) {
    void cargarOcupacion();
    return;
  }
  el<HTMLElement>("#occupancy-countdown").textContent = ` · Próxima actualización en ${segundos} s`;
}

setInterval(actualizarContadorOcupacion, 1000);
