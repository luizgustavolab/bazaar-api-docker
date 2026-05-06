import { Queue, ConnectionOptions } from "bullmq";
import cron from "node-cron";
import { fetchAllActiveAuctions, AuctionData } from "./services/bazaarScraper";
import { prisma } from "../../api/src/lib/prisma";
import { redisConnection } from "../../api/src/lib/redis";

// Resolve o erro de incompatibilidade de tipos do ioredis de forma estrita
const bullmqConnection = redisConnection as unknown as ConnectionOptions;

const bazaarQueue = new Queue("bazaar-queue", {
  connection: bullmqConnection,
});

async function startCrawler() {
  try {
    let totalSent = 0;
    const now = new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });

    console.log(`[CRAWLER] [${now}] Iniciando sincronização via Turso...`);

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
            price: item.currentBid,
            endsAt: item.endDate,
            auctionId: item.auctionId,
            skills: item.skills,
            items: item.items,
          },
          {
            removeOnComplete: {
              count: 20,
              age: 3600,
            },
            removeOnFail: {
              count: 50,
              age: 24 * 3600,
            },
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 2000,
            },
          },
        );
      }
      totalSent += items.length;
      console.log(
        `[CRAWLER] Batch de ${items.length} leilões enfileirados. Total acumulado: ${totalSent}`,
      );
    });

    console.log(
      `[CRAWLER] Sincronização finalizada com sucesso. Total: ${totalSent} leilões.`,
    );
  } catch (error) {
    console.error("[CRAWLER] Erro crítico durante a execução:", error);
  }
}

cron.schedule("0 0 * * *", async () => {
  await startCrawler();
});

console.log("[CRAWLER] Serviço de agendamento online (Cron: 00:00).");

startCrawler();
