import { Queue, ConnectionOptions } from "bullmq";
import cron from "node-cron";
import app from "../../api/src/app";
import { fetchAllActiveAuctions, AuctionData } from "./services/bazaarScraper";
import { prisma } from "../../api/src/lib/prisma";
import { redisConnection } from "../../api/src/lib/redis";

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
            price: item.currentBid,
            endsAt: item.endDate,
            auctionId: item.auctionId,
            skills: item.skills,
            items: item.items,
          },
          {
            removeOnComplete: { count: 20, age: 3600 },
            removeOnFail: { count: 50, age: 24 * 3600 },
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
          },
        );
      }
      totalSent += items.length;
    });

    console.log(`[CRAWLER] Sincronização finalizada. Total: ${totalSent} leilões.`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro crítico";
    console.error("[CRAWLER] Erro:", errorMessage);
  }
}

cron.schedule("0 0 * * *", async () => {
  await startCrawler();
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3333;
    await app.listen({ port, host: "0.0.0.0" });
    console.log(`[CRAWLER-SERVICE] Health check online na porta ${port}`);
    await startCrawler();
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Falha ao iniciar servidor";
    console.error("[CRAWLER-SERVICE]", errorMessage);
    process.exit(1);
  }
};

start();