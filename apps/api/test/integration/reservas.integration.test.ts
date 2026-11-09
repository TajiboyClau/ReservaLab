import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
import { iniciarRedis, redis } from "../../src/db/redis.js";

const habilitada = process.env.RUN_DB_INTEGRATION === "1";
describe.skipIf(!habilitada)("flujo integrado de reservas", () => {
  const sufijo = randomUUID().slice(0, 8);
  let tokenAdmin = "";
  let tokenDocente = "";
  let espacioId = "";
  let reservaId = "";
  let apiKey = "";
  const fecha = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  beforeAll(async () => {
    await iniciarRedis();
    const admin = await request(app).post("/api/v1/auth/login").send({ correo: "admin@reservalab.local", contrasena: "Admin12345!" });
    const docente = await request(app).post("/api/v1/auth/login").send({ correo: "docente@reservalab.local", contrasena: "Docente12345!" });
    tokenAdmin = admin.body.accessToken;
    tokenDocente = docente.body.accessToken;
    expect(admin.status).toBe(200);
    expect(docente.status).toBe(200);
    const usuarios = await request(app).get("/api/v1/admin/users").set("Authorization", `Bearer ${tokenAdmin}`);
    expect(usuarios.status).toBe(200);
    expect(usuarios.body.every((usuario: Record<string, unknown>) => !("contrasenaHash" in usuario))).toBe(true);
  });

  afterAll(async () => {
    if (espacioId) {
      await prisma.reserva.deleteMany({ where: { espacioId } });
      await prisma.espacio.deleteMany({ where: { id: espacioId } });
    }
    if (apiKey) await prisma.claveApi.deleteMany({ where: { nombre: `Integración ${sufijo}` } });
    if (redis.isOpen) await redis.quit();
    await prisma.$disconnect();
  });

  it("crea espacio, rechaza traslape, invalida caché, cancela y usa API key", async () => {
    const espacio = await request(app).post("/api/v1/spaces")
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ nombre: `Prueba ${sufijo}`, edificio: "Integración", tipo: "laboratorio", capacidad: 8 });
    expect(espacio.status).toBe(201);
    espacioId = espacio.body.id;
    const diaPrueba = new Date(`${fecha}T12:00:00-06:00`).getUTCDay() || 7;
    const horarioCreado = await request(app).post(`/api/v1/spaces/${espacioId}/schedules`)
      .set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ diaSemana: diaPrueba, horaInicio: "07:00", horaFin: "22:00" });
    expect(horarioCreado.status).toBe(201);

    const horarioDemo = await request(app).get("/api/v1/spaces/10000000-0000-4000-8000-000000000001/schedules")
      .set("Authorization", `Bearer ${tokenDocente}`);
    expect(horarioDemo.status).toBe(200);
    expect(horarioDemo.body).toHaveLength(7);

    const disponibilidad = `/api/v1/spaces/${espacioId}/availability?date=${fecha}`;
    expect((await request(app).get(disponibilidad).set("Authorization", `Bearer ${tokenDocente}`)).headers["x-cache"]).toBe("MISS");
    expect((await request(app).get(disponibilidad).set("Authorization", `Bearer ${tokenDocente}`)).headers["x-cache"]).toBe("HIT");

    const inicio = `${fecha}T14:00:00-06:00`;
    const fin = `${fecha}T15:00:00-06:00`;
    const body = { espacioId, proposito: "Prueba de integración", inicio, fin };
    const creada = await request(app).post("/api/v1/reservations").set("Authorization", `Bearer ${tokenDocente}`).send(body);
    expect(creada.status).toBe(201);
    reservaId = creada.body.id;
    expect((await request(app).get(disponibilidad).set("Authorization", `Bearer ${tokenDocente}`)).headers["x-cache"]).toBe("MISS");

    const traslape = await request(app).post("/api/v1/reservations").set("Authorization", `Bearer ${tokenDocente}`)
      .send({ ...body, inicio: `${fecha}T14:30:00-06:00`, fin: `${fecha}T15:30:00-06:00` });
    expect(traslape.status).toBe(409);

    expect((await request(app).delete(`/api/v1/reservations/${reservaId}`).set("Authorization", `Bearer ${tokenDocente}`)).status).toBe(200);
    reservaId = "";
    expect((await request(app).get(disponibilidad).set("Authorization", `Bearer ${tokenDocente}`)).headers["x-cache"]).toBe("MISS");

    const key = await request(app).post("/api/v1/api-keys").set("Authorization", `Bearer ${tokenAdmin}`)
      .send({ nombre: `Integración ${sufijo}`, permisos: ["read:spaces", "read:now"] });
    expect(key.status).toBe(201);
    apiKey = key.body.clave;
    const actual = await request(app).get("/api/v1/now").set("X-API-Key", apiKey);
    expect(actual.status).toBe(200);
    expect(actual.headers["x-cache"]).toMatch(/HIT|MISS/);

    const mockoon = await fetch(process.env.NOTIFICATIONS_URL ?? "http://localhost:3001/notifications", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ evento: "prueba_integracion" }),
    });
    expect(mockoon.status).toBe(200);
  });
});
