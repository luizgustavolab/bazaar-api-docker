import { Worker, type Job, Queue, type ConnectionOptions } from "bullmq";
// Ajuste de importação para garantir consistência no ambiente compilado
import { prisma } from "../../api/dist/lib/prisma.js";
import { redisConnection } from "../../api/dist/lib/redis.js";

interface CharacterJobData {
  name: string;
  level: number;
  vocation: string;
  world: string;
  outfitUrl?: string;
  skills?: string | object;
  items?: string | object;
  price: number;
  auctionId: number;
  endsAt: string | number;
}

const bullmqConnection = redisConnection as unknown as ConnectionOptions;

// Worker Principal: Processa os personagens do leilão
const bazaarWorker = new Worker<CharacterJobData>(
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
      // Usamos uma transação ou um upsert robusto
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

      // Removido o console.log excessivo para não sujar o log do Render
    } catch (error: unknown) {
      console.error(
        `[WORKER] Falha ao processar ${name}. O job será re-tentado pelo BullMQ.`,
      );
      throw error; // Lançar o erro permite que o 'attempts' do Crawler funcione
    }
  },
  {
    connection: bullmqConnection,
    concurrency: 5, // Aumentamos para 5 para processar a carga diária mais rápido
    removeOnComplete: { count: 0 }, // O Crawler já gerencia isso
  },
);

// Listener de erros para monitoramento
bazaarWorker.on("failed", (job, err) => {
  console.error(`[WORKER] Job ${job?.id} falhou: ${err.message}`);
});

console.log("[WORKER] Pronto para processar a fila diária.");
