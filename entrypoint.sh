#!/bin/sh
set -e

# Garante que o comando Prisma veja a variável correta
export DATABASE_URL=$TURSO_DATABASE_URL

echo "🔄 [STEP 1] Sincronizando Schema com Turso..."
npx prisma db push --accept-data-loss

echo "🚀 [STEP 2] Iniciando Serviços de Background..."
# Use node direto nos caminhos relativos ao WORKDIR (/app)
node apps/worker/dist/index.js &
node apps/crawler/dist/index.js &

echo "📡 [STEP 3] Iniciando API principal..."
exec node apps/api/dist/server.js