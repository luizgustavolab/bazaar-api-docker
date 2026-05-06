import "dotenv/config";
import { defineConfig } from "prisma/config";

const getPrismaUrl = () => {
  const url =
    process.env.TURSO_DATABASE_URL ||
    process.env.DATABASE_URL ||
    "file:./prisma/dev.db";

  if (url.startsWith("libsql://")) {
    return url.replace("libsql://", "https://");
  }

  return url;
};

export default defineConfig({
  // Localização explícita do schema conforme documentação
  schema: "prisma/schema.prisma",

  datasource: {
    url: getPrismaUrl(),
  },

  migrations: {
    // Caminho para a pasta de migrations (opcional, mas recomendado)
    path: "prisma/migrations",
    // Comando de seed atualizado conforme o padrão da v7
    seed: "npx tsx ./prisma/seed.ts",
  },
});
