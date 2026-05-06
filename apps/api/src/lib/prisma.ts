import { PrismaClient } from "@prisma/client";
import { createClient } from "@libsql/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || url === "undefined") {
  throw new Error("CRITICAL: TURSO_DATABASE_URL is missing or undefined in environment");
}

const libsql = createClient({
  url: url,
  authToken: authToken,
});

const adapter = new PrismaLibSql(libsql as any);
export const prisma = new PrismaClient({ adapter });