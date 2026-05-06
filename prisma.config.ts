import "dotenv/config";
import { defineConfig } from "prisma/config";

const getPrismaUrl = () => {
  let url =
    process.env.DATABASE_URL ||
    process.env.TURSO_DATABASE_URL ||
    "file:./prisma/dev.db";

  const token = process.env.TURSO_AUTH_TOKEN;

  if (url.includes("turso.io") || url.startsWith("libsql://")) {
    url = url.replace("libsql://", "https://");

    if (token && !url.includes("authToken=")) {
      const separator = url.includes("?") ? "&" : "?";
      url = `${url}${separator}authToken=${token}`;
    }
  }

  return url;
};

export default defineConfig({
  schema: "prisma/schema.prisma",

  datasource: {
    url: getPrismaUrl(),
  },

  migrations: {
    path: "prisma/migrations",

    seed: "npx tsx ./prisma/seed.ts",
  },
});
