import app from "./app";
import { startCrawler } from "./services/crawler"; // Ajuste o caminho conforme sua estrutura

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3333;

app
  .listen({ port: PORT, host: "0.0.0.0" })
  .then((address) => {
    console.log(`Server running on ${address}`);

    // Iniciamos o crawler de forma independente após o servidor estar online
    // O .catch aqui é vital para que um erro 403 (Cloudflare) não mate o servidor
    startCrawler().catch((err) => {
      console.error("Crawler failed to start/run:", err.message);
    });
  })
  .catch((err) => {
    console.error("Critical error starting server:", err);
    process.exit(1);
  });
