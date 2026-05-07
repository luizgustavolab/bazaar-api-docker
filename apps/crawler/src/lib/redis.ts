import { Redis, RedisOptions } from "ioredis";

const host = process.env.REDIS_HOST;
const port = Number(process.env.REDIS_PORT) || 6379;
const password = process.env.REDIS_PASSWORD;

if (!host) {
  // No Docker local (via Compose), o host será 'cache'
  console.warn("⚠️ REDIS_HOST não encontrado. Verifique seu arquivo .env");
}

const redisOptions: RedisOptions = {
  host: host || "127.0.0.1",
  port,
  password,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  // Ativa TLS apenas se houver senha (Cenário Upstash Cloud)
  tls: password ? {} : undefined,
};

export const redisConnection = new Redis(redisOptions);

redisConnection.on("error", (err) => {
  if (err.message.includes("ECONNREFUSED")) return; // Silencia logs de conexão local falha no boot
  console.error("❌ Erro no Redis:", err.message);
});
