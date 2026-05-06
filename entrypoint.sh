#!/bin/sh
set -e

# Garante que o Prisma e o Node encontrem a URL correta
export DATABASE_URL="$TURSO_DATABASE_URL"

echo "🔄 [STEP 1] Sincronizando Schema com Turso..."
# A CLI carregará automaticamente a configuração do prisma.config.ts
npx prisma db push --accept-data-loss

echo "🚀 [STEP 2] Iniciando Serviços de Background..."
node apps/worker/dist/index.js &
node apps/crawler/dist/index.js &

echo "📡 [STEP 3] Iniciando API principal..."
exec node apps/api/dist/server.js