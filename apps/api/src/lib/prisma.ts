import { PrismaClient } from "@prisma/client";
import { createClient } from "@libsql/client";
import { PrismaLibSql } from "@prisma/adapter-libsql"; // Corrigido para 'Sql'

const libsql = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Corrigido aqui também na instanciação
const adapter = new PrismaLibSql(libsql); 

export const prisma = new PrismaClient({ adapter });