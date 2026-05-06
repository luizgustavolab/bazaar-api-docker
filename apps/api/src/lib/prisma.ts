import { PrismaClient } from "@prisma/client";
import { createClient } from "@libsql/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql"; // Garanta o SQL maiúsculo aqui

const libsql = createClient({
  // Use a URL original (libsql://) para o cliente nativo do Turso
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const adapter = new PrismaLibSQL(libsql); // O adaptador recebe o cliente do libsql, não a URL diretamente

export const prisma = new PrismaClient({ adapter });