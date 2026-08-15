import { turso } from "./turso.js";

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

export async function upsertCharacterBatch(
  characters: CharacterData[],
): Promise<void> {
  if (characters.length === 0) return;

  const now = new Date().toISOString();

  // 1. Upsert de todos os personagens do lote em UMA única ida-e-volta
  const characterResults = await turso.batch(
    characters.map((char) => ({
      sql: `
        INSERT INTO "Character" (name, vocation, level, world, outfitUrl, skills, items, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET
          vocation = excluded.vocation,
          level = excluded.level,
          world = excluded.world,
          outfitUrl = excluded.outfitUrl,
          skills = excluded.skills,
          items = excluded.items,
          updatedAt = excluded.updatedAt
        RETURNING id;
      `,
      args: [
        char.name,
        char.vocation,
        char.level,
        char.world,
        char.outfitUrl,
        JSON.stringify(char.skills || []),
        JSON.stringify(char.items || []),
        now,
        now,
      ],
    })),
    "write",
  );

  // 2. Upsert dos leilões (precisa dos ids retornados acima) em outra única ida-e-volta
  const auctionStatements = characters.map((char, i) => {
    const characterId = characterResults[i]?.rows[0]?.id as
      | number
      | undefined;
    if (!characterId) {
      throw new Error(`Character "${char.name}" não retornou id após upsert.`);
    }
    return {
      sql: `
        INSERT INTO "Auction" (characterId, price, startedAt, endsAt)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(characterId) DO UPDATE SET
          price = excluded.price,
          endsAt = excluded.endsAt;
      `,
      args: [characterId, char.currentBid, now, String(char.endDate)],
    };
  });

  await turso.batch(auctionStatements, "write");
}
