#!/bin/sh

# 1. Sincroniza o banco Turso com o schema do Prisma
# O --accept-data-loss é necessário para o Turso em certos tipos de alteração de schema
echo "🔄 Sincronizando banco Turso..."
npx prisma db push --accept-data-loss

# 2. Inicia os processos de background (Worker e Crawler)
# Usamos o '&' para rodar em paralelo
echo "🚀 Iniciando Worker..."
npm run start:worker &

echo "🕵️ Iniciando Crawler..."
npm run start:crawler &

# 3. Inicia a API (Processo Principal)
# Usamos 'exec' para que o Node.js assuma o PID 1. 
# Isso permite que o Render desligue o container graciosamente quando necessário.
echo "📡 API Online na porta 3333..."
exec npm run start:api