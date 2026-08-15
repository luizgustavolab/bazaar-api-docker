import { Queue, type ConnectionOptions } from "bullmq";
import cron from "node-cron";
import {
  fetchAllActiveAuctions,
  type AuctionData,
} from "./services/bazaarScraper.js";
import { prisma } from "./lib/prisma.js";
import { redisConnection } from "./lib/redis.js";
import { startBazaarWorker, stopBazaarWorker } from "../../worker/src/index.js";
import { cleanupExpiredAuctions } from "../../worker/src/lib/cleanup.js";

const bullmqConnection = redisConnection as unknown as ConnectionOptions;

const bazaarQueue = new Queue("bazaar-queue", {
  connection: bullmqConnection,
  defaultJobOptions: {
    removeOnComplete: true,
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  },
});

async function runCrawlerCycle(): Promise<void> {
  try {
    const now = new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });
    console.log(`[CRAWLER] [${now}] Iniciando ciclo com Worker temporário...`);

    // 1. Garante banco e inicia o Worker
    await prisma.$queryRaw`SELECT 1`;
    startBazaarWorker();

    // 2. Executa o scraper enviando os lotes
    await fetchAllActiveAuctions(async (items: AuctionData[]) => {
      if (items.length > 0) {
        await bazaarQueue.add("process-batch", { characters: items });
      }
    });

    // 3. Monitoramento inteligente: Aguarda a fila esvaziar para desligar
    let jobs = await bazaarQueue.getJobCounts();
    while (jobs.active > 0 || jobs.waiting > 0) {
      console.log(
        `[CRAWLER] Processando: ${jobs.active} ativos, ${jobs.waiting} na fila...`,
      );
      await new Promise((res) => setTimeout(res, 10000)); // Checa a cada 10s
      jobs = await bazaarQueue.getJobCounts();
    }

    console.log(`[CRAWLER] Sincronização concluída com sucesso.`);

    // 4. Remove leilões expirados (personagens que já saíram do bazar)
    const removed = await cleanupExpiredAuctions();
    console.log(`[CRAWLER] Limpeza: ${removed} leilões expirados removidos.`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown Error";
    console.error("[CRAWLER] Erro crítico no ciclo:", msg);
  } finally {
    // 5. DESLIGA O WORKER: Para de falar com o Redis imediatamente
    await stopBazaarWorker();
  }
}

cron.schedule(
  "0 0 * * *",
  () => {
    const now = new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });
    console.log(`[CRAWLER] [${now}] Disparando execução agendada...`);
    void runCrawlerCycle();
  },
  {
    scheduled: true,
    timezone: "America/Sao_Paulo",
  },
);

const start = async (): Promise<void> => {
  const bootTime = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
  console.log(
    `[CRAWLER-SERVICE] [${bootTime}] Iniciado em modo Standby (Economia Upstash).`,
  );

  setInterval(
    () => {
      const now = new Date().toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      });
      console.log(`[CRAWLER-SERVICE] Heartbeat: ${now}`);
    },
    1000 * 60 * 60,
  );
};

void start();
