import { Worker, type Job, type ConnectionOptions } from "bullmq";
import { upsertCharacterBatch } from "./lib/batchUpsert.js";
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
      console.log(
        `[WORKER] Processando lote com ${characters.length} itens (batch).`,
      );

      if (characters.length === 0) return;

      try {
        await upsertCharacterBatch(characters);

        console.log(
          `[WORKER] Lote finalizado (batch). Sucessos: ${characters.length}`,
        );
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Erro desconhecido";
        console.error(`[WORKER] Falha crítica no lote:`, msg);
        throw error;
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
