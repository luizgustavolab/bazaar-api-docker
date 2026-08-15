import { fetchAllActiveAuctions } from "./services/bazaarScraper.js";
import { upsertCharacterBatch } from "../../worker/src/lib/batchUpsert.js";
import { cleanupExpiredAuctions } from "../../worker/src/lib/cleanup.js";

// Script de sincronização manual: roda o scraping + grava direto no Turso,
// sem depender de Redis/BullMQ. Precisa rodar de uma rede que não seja
// classificada como "hosting" pelo Cloudflare (tibia.com bloqueia essas de
// forma direta, sem desafio JS pra resolver) — ou seja, não roda em Render,
// GitHub Actions ou provedores cloud gratuitos em geral. Uso local:
//
//   DATABASE_URL=... TURSO_AUTH_TOKEN=... npx tsx apps/crawler/src/ci.ts
async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log("[CI-CRAWLER] Iniciando sincronização manual...");

  let totalPages = 0;
  let totalItems = 0;

  await fetchAllActiveAuctions(async (items) => {
    totalPages++;
    totalItems += items.length;
    await upsertCharacterBatch(items);
    console.log(
      `[CI-CRAWLER] Página ${totalPages} processada (${items.length} itens, total ${totalItems}).`,
    );
  });

  const removed = await cleanupExpiredAuctions();
  console.log(`[CI-CRAWLER] Limpeza: ${removed} leilões expirados removidos.`);

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(0);
  console.log(
    `[CI-CRAWLER] Concluído em ${elapsed}s. Páginas: ${totalPages}, itens: ${totalItems}.`,
  );
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : "Erro desconhecido";
  console.error("[CI-CRAWLER] Falha crítica:", msg);
  process.exit(1);
});
