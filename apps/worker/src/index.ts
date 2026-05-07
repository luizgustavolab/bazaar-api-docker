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
  endDate: string;    // Mapeado do Scraper
}


interface BatchJobData {
  characters: CharacterData[];
}

const bullmqConnection = redisConnection as unknown as ConnectionOptions;

const bazaarWorker = new Worker<BatchJobData>(
  "bazaar-queue",
  async (job: Job<BatchJobData>) => {
    const { characters } = job.data;

    console.log(`[WORKER] Iniciando processamento de lote com ${characters.length} itens.`);

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
                  endsAt: String(char.endDate) 
                },
                update: { 
                  price: char.currentBid, 
                  endsAt: String(char.endDate) 
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
                endsAt: String(char.endDate) 
              },
            },
          },
        });
        successCount++;
      } catch (error: unknown) {
        errorCount++;
        const msg = error instanceof Error ? error.message : "Erro desconhecido";
        console.error(`[WORKER] Falha ao processar char "${char.name}":`, msg);
        
      }
    }

    console.log(`[WORKER] Lote finalizado. Sucessos: ${successCount} | Falhas: ${errorCount}`);
    
    
    if (successCount === 0 && characters.length > 0) {
      throw new Error("Lote falhou completamente. Re-tentando...");
    }
  },
  {
    connection: bullmqConnection,
    concurrency: 2, 
    removeOnComplete: { count: 0 }, 
  }
);

bazaarWorker.on("failed", (job, err) => {
  console.error(`[WORKER] Job ${job?.id} falhou criticamente: ${err.message}`);
});

console.log("[WORKER] Pronto para processar lotes de personagens.");