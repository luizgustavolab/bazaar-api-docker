import { createClient, type Client } from "@libsql/client";
import "../config/env.js";

const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  throw new Error("DATABASE_URL is not defined");
}

export const turso: Client = createClient({ url, authToken });
