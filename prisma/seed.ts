import { prisma } from "../apps/api/src/lib/prisma";
import "dotenv/config";

const characters = [
  { name: "Arthas", level: 100, vocation: "Knight", world: "Antica" },
  { name: "Jaina", level: 90, vocation: "Sorcerer", world: "Antica" },
];

async function main() {
  console.log("--- 🌱 Iniciando Seed (Turso Cloud Mode) ---");

  try {
    // Teste de conexão inicial
    await prisma.$connect();
    console.log("✅ Conexão com Turso estabelecida.");

    for (const char of characters) {
      console.log(`Checking character: ${char.name}`);

      await prisma.character.upsert({
        where: { name: char.name },
        update: {
          level: char.level,
          vocation: char.vocation,
          world: char.world,
        },
        create: {
          name: char.name,
          level: char.level,
          vocation: char.vocation,
          world: char.world,
        },
      });
    }

    console.log("--- ✅ Seed finalizado com sucesso no Turso! ---");
  } catch (error) {
    console.error("❌ Erro durante a execução do Seed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
