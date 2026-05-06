import { PrismaClient } from "@prisma/client";
import { createClient } from "@libsql/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  throw new Error("TURSO_DATABASE_URL não configurada");
}

const libsql = createClient({
  url: url,
  authToken: authToken,
});

// Silenciando o aviso de 'any' pois o adapter exige compatibilidade interna do driver
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const adapter = new PrismaLibSql(libsql as any);

export const prisma = new PrismaClient({ adapter });
