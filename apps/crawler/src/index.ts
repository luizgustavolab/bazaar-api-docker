import { Queue, type ConnectionOptions } from "bullmq";
import cron from "node-cron";
import type { FastifyInstance } from "fastify";

import appInstance from "../../api/dist/app.js";
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
            removeOnComplete: { count: 20 },
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
          },
        );
      }
    });
    console.log(`[CRAWLER] Ciclo finalizado.`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown Error";
    console.error("[CRAWLER] Erro:", msg);
  }
}

cron.schedule("0 0 * * *", () => {
  void runCrawlerCycle();
});

const start = async (): Promise<void> => {
  try {
    const port = Number(process.env.PORT) || 3333;
    const fastifyApp = appInstance as unknown as FastifyInstance;
    await fastifyApp.listen({ port, host: "0.0.0.0" });
    console.log(`[CRAWLER-SERVICE] Online na porta ${port}`);
    await runCrawlerCycle();
  } catch (err: unknown) {
    process.exit(1);
  }
};

void start();
