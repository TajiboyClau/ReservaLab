import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { crearEspacioSchema } from "@reservalab/shared";

const terminal = createInterface({ input, output });
const baseUrl = process.env.RESERVALAB_API_URL ?? "http://localhost:3000/api/v1";
let accessToken = "";

async function pedir(etiqueta: string) { return (await terminal.question(`${etiqueta}: `)).trim(); }
async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? `Error HTTP ${response.status}`);
  return data as T;
}

try {
  console.log("ReservaLab - Herramienta de administración");
  const correo = await pedir("Correo de administrador");
  const contrasena = await pedir("Contraseña");
  const sesion = await request<{ accessToken: string }>("/auth/login", "POST", { correo, contrasena });
  accessToken = sesion.accessToken;
  console.log("\n1. Crear espacio\n2. Emitir API key\n3. Salir");
  while (true) {
    const opcion = await pedir("Elige una opción");
    if (opcion === "3") break;
    if (opcion === "1") {
      const nombre = await pedir("Nombre del espacio");
      const edificio = await pedir("Edificio");
      const tipo = await pedir("Tipo (laboratorio/salon)");
      const capacidad = await pedir("Capacidad");
      const entrada = crearEspacioSchema.parse({ nombre, edificio, tipo, capacidad });
      const espacio = await request<{ id: string }>("/spaces", "POST", entrada);
      console.log(`Espacio creado: ${espacio.id}`);
    } else if (opcion === "2") {
      const nombre = await pedir("Nombre para la clave");
      const permiso = await pedir("Permiso (read:spaces/read:now)");
      if (permiso !== "read:spaces" && permiso !== "read:now") throw new Error("Permiso no válido");
      const resultado = await request<{ clave: string }>("/api-keys", "POST", { nombre, permisos: [permiso] });
      console.log(`Copia esta clave ahora; se mostrará una sola vez:\n${resultado.clave}`);
    } else console.log("Opción no reconocida");
  }
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
} finally {
  terminal.close();
}
