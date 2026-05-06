import { PrismaClient } from "@prisma/client";
import { createClient } from "@libsql/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não definida");
}

if (!process.env.TURSO_AUTH_TOKEN) {
  throw new Error("TURSO_AUTH_TOKEN não definido");
}

const libsql = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const adapter = new PrismaLibSql(libsql as any);

export const prisma = new PrismaClient({
  adapter,
});