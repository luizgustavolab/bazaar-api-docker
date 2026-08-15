import { fetchAllActiveAuctions } from "./services/bazaarScraper.js";
import { upsertCharacterBatch } from "../../worker/src/lib/batchUpsert.js";
import { cleanupExpiredAuctions } from "../../worker/src/lib/cleanup.js";

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log("[CI-CRAWLER] Iniciando sincronização (GitHub Actions)...");

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
