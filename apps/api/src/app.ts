import Fastify from "fastify";
import cors from "@fastify/cors";
import { characterRoutes } from "./routes/character";
import { healthRoutes } from "./controllers/healthController";

const app = Fastify({
  logger: true,
  // Aumenta o tempo de timeout para evitar que conexões com o Turso
  // em momentos de latência alta derrubem a requisição prematuramente
  connectionTimeout: 10000,
});

// Configuração de CORS assertiva
app.register(cors, {
  // Em produção no Render, você pode substituir 'true' pela URL do seu frontend Vercel
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
});

// Registro das rotas
app.register(healthRoutes);
app.register(characterRoutes, { prefix: "/api" }); // Opcional: Adiciona prefixo para organizar a API

// Tratamento global de erros para não expor detalhes sensíveis do banco em produção
app.setErrorHandler((error, request, reply) => {
  app.log.error(error);
  reply.status(500).send({
    error: "Internal Server Error",
    message: "Ocorreu um erro ao processar sua requisição no servidor.",
  });
});

export default app;
