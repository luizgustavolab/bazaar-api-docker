import { prisma } from "../apps/api/src/lib/prisma.js";
import "dotenv/config";

const characters = [
  { name: "Arthas", level: 100, vocation: "Knight", world: "Antica" },
  { name: "Jaina", level: 90, vocation: "Sorcerer", world: "Antica" },
];

async function main(): Promise<void> {
  console.log("--- 🌱 Iniciando Seed (Turso Cloud Mode) ---");
  try {
    await prisma.$connect();
    for (const char of characters) {
      await prisma.character.upsert({
        where: { name: char.name },
        update: { ...char },
        create: { ...char },
      });
    }
    console.log("--- ✅ Seed finalizado! ---");
  } catch (error) {
    console.error("❌ Erro no Seed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
