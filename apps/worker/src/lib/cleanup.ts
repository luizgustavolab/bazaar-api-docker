import { turso } from "./turso.js";

export async function cleanupExpiredAuctions(): Promise<number> {
  const nowInSeconds = Math.floor(Date.now() / 1000).toString();

  const expired = await turso.execute({
    sql: `SELECT characterId FROM "Auction" WHERE endsAt < ?`,
    args: [nowInSeconds],
  });

  if (expired.rows.length === 0) return 0;

  const characterIds = expired.rows.map((r) => r.characterId as number);
  const placeholders = characterIds.map(() => "?").join(",");

  await turso.batch(
    [
      {
        sql: `DELETE FROM "Auction" WHERE characterId IN (${placeholders})`,
        args: characterIds,
      },
      {
        sql: `DELETE FROM "Character" WHERE id IN (${placeholders})`,
        args: characterIds,
      },
    ],
    "write",
  );

  return characterIds.length;
}
