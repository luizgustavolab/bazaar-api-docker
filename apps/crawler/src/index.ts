import { Queue, type ConnectionOptions } from "bullmq";
import cron from "node-cron";

// Importe diretamente o que você precisa, sem trazer o app (servidor) da API
import {
  fetchAllActiveAuctions,
  type AuctionData,
} from "./services/bazaarScraper.js";
import { prisma } from "../../api/dist/lib/prisma.js";
import { redisConnection } from "../../api/dist/lib/redis.js";

const bullmqConnection = redisConnection as unknown as ConnectionOptions;
const bazaarQueue = new Queue("bazaar-queue", { connection: bullmqConnection });

async function runCrawlerCycle(): Promise<void> {
  try {
    const now = new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });
    console.log(`[CRAWLER] [${now}] Iniciando sincronização...`);

    await prisma.$queryRaw`SELECT 1`;

    await fetchAllActiveAuctions(async (items: AuctionData[]) => {
      for (const item of items) {
        await bazaarQueue.add(
          "process-auction",
          {
            name: item.name,
            level: item.level,
            vocation: item.vocation,
            world: item.world,
            outfitUrl: item.outfitUrl,
            skills: item.skills,
            items: item.items,
            price: item.currentBid,
            auctionId: item.auctionId,
            endsAt: item.endDate,
          },
          {
            removeOnComplete: true, 
            removeOnFail: { count: 10 }, 
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
          },
        );
      }
    });
    console.log(`[CRAWLER] Ciclo finalizado. Itens enviados para a fila.`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown Error";
    console.error("[CRAWLER] Erro crítico:", msg);
  }
}

// Agendamento: A cada 2 minutos (para teste inicial)
cron.schedule("*/2 * * * *", () => {
  void runCrawlerCycle();
});

const start = async (): Promise<void> => {
  try {
    console.log(`[CRAWLER-SERVICE] Rodando em background.`);
    
    // Executa uma vez no boot para popular o banco IMEDIATAMENTE (Sugerido para agora)
    console.log("[CRAWLER] Executando carga inicial...");
    await runCrawlerCycle();
    
    // Mantém o processo vivo
    setInterval(() => {}, 1000 * 60 * 60);
  } catch (err: unknown) {
    console.error("[CRAWLER-SERVICE] Falha ao iniciar:", err);
    process.exit(1);
  }
};

void start();