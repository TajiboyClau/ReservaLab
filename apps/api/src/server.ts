import "dotenv/config";
import { app } from "./app.js";
import { prisma } from "./db/prisma.js";
import { iniciarRedis, redis } from "./db/redis.js";

const port = Number(process.env.PORT ?? 3000);
void iniciarRedis();
const server = app.listen(port, () => console.log(`ReservaLab API escuchando en http://localhost:${port}`));

async function cerrar() {
  server.close();
  if (redis.isOpen) await redis.quit();
  await prisma.$disconnect();
}
process.on("SIGINT", () => void cerrar());
process.on("SIGTERM", () => void cerrar());
