/// <reference types="node" />
import { defineConfig } from "@prisma/config";

/**
 * Configuração central do Prisma.
 * Em produção (Render), utilizamos o DATABASE_URL do Turso.
 * Em desenvolvimento local, ele pode cair para o SQLite se a env não existir.
 */
export default defineConfig({
  datasource: {
    // Prioriza a variável de ambiente (Turso) sobre o arquivo local
    url: process.env.DATABASE_URL || "file:./prisma/dev.db",
  },
  migrations: {
    // Ajustado para garantir que o tsx execute o seed corretamente no Monorepo
    seed: "npx tsx ./prisma/seed.ts",
  },
});
