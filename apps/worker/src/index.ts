import { Worker, Job, Queue, ConnectionOptions } from "bullmq";
import { prisma } from "../../api/src/lib/prisma";
import { redisConnection } from "../../api/src/lib/redis";

interface CharacterJobData {
  name: string;
  level: number;
  vocation: string;
  world: string;
  outfitUrl?: string;
  skills?: string | object;
  items?: string | object;
  price: number;
  endsAt: string | number;
}

// Resolve o erro de incompatibilidade de tipos do ioredis de forma estrita
const bullmqConnection = redisConnection as unknown as ConnectionOptions;

const cleanupQueue = new Queue("cleanup-queue", {
  connection: bullmqConnection,
});

async function setupCleanupJob() {
  await cleanupQueue.add(
    "clean-expired-auctions",
    {},
    {
      jobId: "daily-cleanup",
      repeat: { pattern: "0 0 * * *" },
      removeOnComplete: true,
    },
  );
}

new Worker<CharacterJobData>(
  "bazaar-queue",
  async (job: Job<CharacterJobData>) => {
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

    try {
      await prisma.character.upsert({
        where: { name },
        update: {
          level,
          vocation,
          world,
          outfitUrl,
          skills:
            typeof skills === "object"
              ? JSON.stringify(skills)
              : String(skills || "{}"),
          items:
            typeof items === "object"
              ? JSON.stringify(items)
              : String(items || "[]"),
          auction: {
            upsert: {
              create: { price, endsAt: String(endsAt) },
              update: { price, endsAt: String(endsAt) },
            },
          },
        },
        create: {
          name,
          level,
          vocation,
          world,
          outfitUrl,
          skills:
            typeof skills === "object"
              ? JSON.stringify(skills)
              : String(skills || "{}"),
          items:
            typeof items === "object"
              ? JSON.stringify(items)
              : String(items || "[]"),
          auction: {
            create: { price, endsAt: String(endsAt) },
          },
        },
      });

      console.log(`[WORKER] ${name} sincronizado com sucesso.`);
    } catch (error) {
      console.error(`[WORKER] Erro ao processar ${name}:`, error);
      throw error;
    }
  },
  {
    connection: bullmqConnection,
    removeOnComplete: { count: 20 },
    removeOnFail: { count: 50 },
    concurrency: 2,
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

          await prisma.$transaction([
            prisma.auction.deleteMany({ where: { id: { in: auctionIds } } }),
            prisma.character.deleteMany({
              where: { id: { in: characterIds } },
            }),
          ]);

          console.log(
            `[CLEANUP] ${auctionIds.length} leilões expirados removidos.`,
          );
        }
      } catch (error) {
        console.error("[CLEANUP] Erro na limpeza:", error);
        throw error;
      }
    }
  },
  { connection: bullmqConnection },
);

setupCleanupJob().catch(console.error);
