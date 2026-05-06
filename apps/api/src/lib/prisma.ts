import { PrismaClient } from "@prisma/client";
import { createClient } from "@libsql/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const DATABASE_URL = process.env.DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

console.log("[PRISMA] DATABASE_URL:", DATABASE_URL ? "OK" : "UNDEFINED");
console.log("[PRISMA] TURSO_AUTH_TOKEN:", TURSO_AUTH_TOKEN ? "OK" : "UNDEFINED");

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL não definida");
}

if (!TURSO_AUTH_TOKEN) {
  throw new Error("TURSO_AUTH_TOKEN não definido");
}

const libsql = createClient({
  url: DATABASE_URL,
  authToken: TURSO_AUTH_TOKEN,
});

const adapter = new PrismaLibSQL(libsql);

export const prisma = new PrismaClient({
  adapter,
});