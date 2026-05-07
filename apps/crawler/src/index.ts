import { Queue, type ConnectionOptions } from "bullmq";
import cron from "node-cron";

import {
  fetchAllActiveAuctions,
  type AuctionData,
} from "./services/bazaarScraper.js";
import { prisma } from "./lib/prisma.js";
import { redisConnection } from "./lib/redis.js";

const bullmqConnection = redisConnection as unknown as ConnectionOptions;

// Definimos a fila
const bazaarQueue = new Queue("bazaar-queue", { 
  connection: bullmqConnection,
  defaultJobOptions: {
    removeOnComplete: true, // Limpa o Redis automaticamente após o sucesso
    removeOnFail: { count: 10 }, // Mantém histórico apenas das últimas 10 falhas
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  }
});

async function runCrawlerCycle(): Promise<void> {
  try {
    const now = new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });
    console.log(`[CRAWLER] [${now}] Iniciando sincronização em lote...`);

  
    await prisma.$queryRaw`SELECT 1`;

    // Executa o scraper enviando os lotes para a fila do BullMQ
    await fetchAllActiveAuctions(async (items: AuctionData[]) => {
      if (items.length > 0) {
        await bazaarQueue.add(
          "process-batch", 
          { characters: items } 
        );
      }
    });

    console.log(`[CRAWLER] Ciclo finalizado. Lotes de páginas enviados para a fila.`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown Error";
    console.error("[CRAWLER] Erro crítico no ciclo:", msg);
  }
}


cron.schedule("0 0 * * *", () => {
  const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  console.log(`[CRAWLER] [${now}] Disparando execução agendada diária...`);
  void runCrawlerCycle();
}, {
  scheduled: true,
  timezone: "America/Sao_Paulo"
});

const start = async (): Promise<void> => {
  try {
    const bootTime = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    console.log(`[CRAWLER-SERVICE] [${bootTime}] Iniciado. Aguardando agendamento (00:00).`);

  
    setInterval(() => {
      const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      console.log(`[CRAWLER-SERVICE] Heartbeat: ${now} - Serviço ativo.`);
    }, 1000 * 60 * 60); 

  } catch (err: unknown) {
    console.error("[CRAWLER-SERVICE] Falha fatal ao iniciar:", err);
    process.exit(1);
  }
};

void start();