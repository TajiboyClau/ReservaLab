import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function crearUsuario(nombre: string, correo: string, contrasena: string, rol: string) {
  const contrasenaHash = await bcrypt.hash(contrasena, 12);
  await prisma.usuario.upsert({
    where: { correo },
    update: { nombre, contrasenaHash, rol, activo: true },
    create: { nombre, correo, contrasenaHash, rol },
  });
}

try {
  await crearUsuario("Administración ReservaLab", "admin@reservalab.local", "Admin12345!", "administrador");
  await crearUsuario("Docente de prueba", "docente@reservalab.local", "Docente12345!", "docente");
  await prisma.espacio.upsert({
    where: { id: "10000000-0000-4000-8000-000000000001" },
    update: {},
    create: {
      id: "10000000-0000-4000-8000-000000000001",
      nombre: "Laboratorio 1",
      edificio: "Ingeniería",
      tipo: "laboratorio",
      capacidad: 25,
      descripcion: "Espacio de prueba creado por el seed",
    },
  });
  await prisma.horarioDisponible.createMany({
    data: Array.from({ length: 7 }, (_, indice) => ({
      espacioId: "10000000-0000-4000-8000-000000000001",
      diaSemana: indice + 1,
      horaInicio: new Date("1970-01-01T07:00:00.000Z"),
      horaFin: new Date("1970-01-01T22:00:00.000Z"),
    })),
    skipDuplicates: true,
  });
} finally {
  await prisma.$disconnect();
}
