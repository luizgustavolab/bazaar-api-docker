import { Worker, type Job, type ConnectionOptions } from "bullmq";
import { prisma } from "./lib/prisma.js";
import { redisConnection } from "./lib/redis.js";

interface CharacterData {
  name: string;
  level: number;
  vocation: string;
  world: string;
  outfitUrl: string;
  skills: string[];
  items: string[];
  currentBid: number;
  auctionId: number;
  endDate: string;
}

interface BatchJobData {
  characters: CharacterData[];
}

const bullmqConnection = redisConnection as unknown as ConnectionOptions;

let workerInstance: Worker<BatchJobData> | null = null;

export function startBazaarWorker() {
  if (workerInstance) return workerInstance;

  console.log("[WORKER] Ligando: Iniciando processamento de lotes...");

  workerInstance = new Worker<BatchJobData>(
    "bazaar-queue",
    async (job: Job<BatchJobData>) => {
      const { characters } = job.data;
      console.log(`[WORKER] Processando lote com ${characters.length} itens.`);

      let successCount = 0;
      let errorCount = 0;

      for (const char of characters) {
        try {
          await prisma.character.upsert({
            where: { name: char.name },
            update: {
              level: char.level,
              vocation: char.vocation,
              world: char.world,
              outfitUrl: char.outfitUrl,
              skills: JSON.stringify(char.skills || []),
              items: JSON.stringify(char.items || []),
              updatedAt: new Date(),
              auction: {
                upsert: {
                  create: {
                    price: char.currentBid,
                    endsAt: String(char.endDate),
                  },
                  update: {
                    price: char.currentBid,
                    endsAt: String(char.endDate),
                  },
                },
              },
            },
            create: {
              name: char.name,
              level: char.level,
              vocation: char.vocation,
              world: char.world,
              outfitUrl: char.outfitUrl,
              skills: JSON.stringify(char.skills || []),
              items: JSON.stringify(char.items || []),
              auction: {
                create: {
                  price: char.currentBid,
                  endsAt: String(char.endDate),
                },
              },
            },
          });
          successCount++;
        } catch (error: unknown) {
          errorCount++;
          const msg =
            error instanceof Error ? error.message : "Erro desconhecido";
          console.error(
            `[WORKER] Falha ao processar char "${char.name}":`,
            msg,
          );
        }
      }

      console.log(
        `[WORKER] Lote finalizado. Sucessos: ${successCount} | Falhas: ${errorCount}`,
      );

      if (successCount === 0 && characters.length > 0) {
        throw new Error("Lote falhou completamente.");
      }
    },
    {
      connection: bullmqConnection,
      concurrency: 2,
      stalledInterval: 300000,
      removeOnComplete: { count: 1 },
      removeOnFail: { count: 5 },
    },
  );

  workerInstance.on("failed", (job, err) => {
    console.error(
      `[WORKER] Job ${job?.id} falhou criticamente: ${err.message}`,
    );
  });

  return workerInstance;
}

export async function stopBazaarWorker() {
  if (workerInstance) {
    console.log("[WORKER] Desligando: Ciclo finalizado e conexões encerradas.");
    await workerInstance.close();
    workerInstance = null;
  }
}
