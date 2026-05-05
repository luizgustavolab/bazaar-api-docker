import { Queue } from "bullmq";
import IORedis from "ioredis";
import cron from "node-cron";
import { fetchAllActiveAuctions, AuctionData } from "./services/bazaarScraper";

const connection = new IORedis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});

const bazaarQueue = new Queue("bazaar-queue", {
  connection: connection as unknown as Queue["opts"]["connection"],
});

async function startCrawler() {
  try {
    let totalSent = 0;
    const now = new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });
    console.log(`[CRAWLER] [${now}] Iniciando sincronização...`);

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
            removeOnComplete: true,
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 1000,
            },
          },
        );
      }
      totalSent += items.length;
      console.log(
        `[CRAWLER] ${items.length} leilões enviados. Total: ${totalSent}`,
      );
    });

    console.log(`[CRAWLER] Finalizado. Total: ${totalSent} leilões.`);
  } catch (error) {
    console.error("[CRAWLER] Erro crítico:", error);
  }
}

// Agendamento: 00:00 (Meia-noite)
// Removi o objeto de opções e deixei o padrão simples para evitar erros de biblioteca de timezone
cron.schedule("0 0 * * *", async () => {
  await startCrawler();
});

console.log("[CRAWLER] Serviço de agendamento online (00:00).");

// Execução imediata ao subir o container para garantir que o banco não fique vazio no primeiro deploy
startCrawler();
