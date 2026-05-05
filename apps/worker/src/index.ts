import { Worker, Job, Queue } from "bullmq";
import IORedis from "ioredis";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const connection = new IORedis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});

const cleanupQueue = new Queue("cleanup-queue", {
  connection: connection as unknown as Queue["opts"]["connection"],
});

async function setupCleanupJob() {
  await cleanupQueue.add(
    "clean-expired-auctions",
    {},
    {
      repeat: {
        pattern: "0 0 * * *",
      },
    },
  );
}

new Worker(
  "bazaar-queue",
  async (job: Job) => {
    try {
      const {
        name,
        level,
        vocation,
        world,
        outfitUrl,
        skills,
        items,
        price,
        endsAt,
      } = job.data;

      await prisma.character.upsert({
        where: { name },
        update: {
          level,
          vocation,
          world,
          outfitUrl,
          skills: skills ? JSON.stringify(skills) : "{}",
          items: items ? JSON.stringify(items) : "[]",
          auction: {
            upsert: {
              create: { price, endsAt },
              update: { price, endsAt },
            },
          },
        },
        create: {
          name,
          level,
          vocation,
          world,
          outfitUrl,
          skills: skills ? JSON.stringify(skills) : "{}",
          items: items ? JSON.stringify(items) : "[]",
          auction: {
            create: { price, endsAt },
          },
        },
      });

      console.log(`[WORKER] Dados de ${name} sincronizados.`);
    } catch (error) {
      console.error(`[WORKER] Erro no job ${job.id}:`, error);
      throw error;
    }
  },
  {
    connection: connection as unknown as Worker["opts"]["connection"],
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
);

new Worker(
  "cleanup-queue",
  async (job: Job) => {
    if (job.name === "clean-expired-auctions") {
      try {
        const nowInSeconds = Math.floor(Date.now() / 1000).toString();

        const expiredAuctions = await prisma.auction.findMany({
          where: { endsAt: { lt: nowInSeconds } },
          select: { id: true, characterId: true },
        });

        if (expiredAuctions.length > 0) {
          const auctionIds = expiredAuctions.map((a) => a.id);
          const characterIds = expiredAuctions.map((a) => a.characterId);

          await prisma.auction.deleteMany({
            where: { id: { in: auctionIds } },
          });

          await prisma.character.deleteMany({
            where: { id: { in: characterIds } },
          });

          console.log(
            `[CLEANUP-WORKER] Removidos ${auctionIds.length} leilões e seus personagens correspondentes.`,
          );
        }
      } catch (error) {
        console.error("[CLEANUP-WORKER] Erro ao limpar leiloes:", error);
        throw error;
      }
    }
  },
  { connection: connection as unknown as Worker["opts"]["connection"] },
);

setupCleanupJob();
