#!/bin/sh

# 1. Sincroniza o banco Turso com o schema do Prisma
echo "🔄 Sincronizando banco Turso..."
npx prisma db push --accept-data-loss

# 2. Inicia os processos de background (Worker e Crawler)
# Chamamos o node diretamente no arquivo compilado (dist)
echo "🚀 Iniciando Worker..."
node apps/worker/dist/index.js &

echo "🕵️ Iniciando Crawler..."
node apps/crawler/dist/index.js &

# 3. Inicia a API (Processo Principal)
# Usar 'exec node' garante que o sinal de desligamento chegue direto ao app
echo "📡 API Online na porta 3333..."
exec node apps/api/dist/server.js