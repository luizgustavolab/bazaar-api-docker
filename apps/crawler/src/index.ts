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
    console.log(`[CRAWLER] [${now}] Iniciando sincronização diária...`);

    // Valida conexão com o Turso antes de começar o scraping pesado
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
            // removeOnComplete: true economiza muitos comandos no Upstash
            removeOnComplete: true, 
            removeOnFail: { count: 10 }, 
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 }, // Delay maior para resiliência
          },
        );
      }
    });
    console.log(`[CRAWLER] Ciclo finalizado com sucesso.`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown Error";
    console.error("[CRAWLER] Erro crítico no ciclo:", msg);
  }
}

// Agendamento: 00:00 (Meia-noite) todos os dias
cron.schedule("*/2 * * * *", () => {
  console.log("[TESTE] Forçando ciclo de sincronização...");
  void runCrawlerCycle();
});

const start = async (): Promise<void> => {
  try {
    const port = Number(process.env.PORT) || 3333;
    const fastifyApp = appInstance as unknown as FastifyInstance;
    
    // Escuta na porta para o Render não dar 'Health Check Failed'
    await fastifyApp.listen({ port, host: "0.0.0.0" });
    console.log(`[CRAWLER-SERVICE] Monitor de Health Check online.`);
    
    // IMPORTANTE: Removido o runCrawlerCycle() automático do boot 
    // para evitar que cada deploy ou restart do Render gaste créditos 
    // fora do horário programado.
    console.log("[CRAWLER] Aguardando próximo ciclo agendado (00:00).");
  } catch (err: unknown) {
    console.error("[CRAWLER-SERVICE] Falha ao iniciar:", err);
    process.exit(1);
  }
};

void start();