import "dotenv/config";
import { defineConfig } from "prisma/config";

const getPrismaUrl = () => {
  let url =
    process.env.TURSO_DATABASE_URL ||
    process.env.DATABASE_URL ||
    "file:./prisma/dev.db";

  const token = process.env.TURSO_AUTH_TOKEN;

  // Se for uma URL do Turso e tivermos um token separado
  if (url.startsWith("libsql://") || url.includes("turso.io")) {
    // 1. Garante que o protocolo seja https:// para a CLI (evita erros de engine)
    url = url.replace("libsql://", "https://");

    // 2. Se o token não estiver na URL, anexa ele
    if (token && !url.includes("authToken=")) {
      const separator = url.includes("?") ? "&" : "?";
      url = `${url}${separator}authToken=${token}`;
    }
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
