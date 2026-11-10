import { ocupacionActual } from "../repositorios/ocupacion.repo.js";

export function consultarOcupacionActual() {
  return ocupacionActual();
}
