#!/bin/sh
set -e

echo "🔄 [STEP 1] Sincronizando Schema com Turso..."
npx prisma db push --accept-data-loss

echo "🚀 [STEP 2] Iniciando Serviços de Background..."
node apps/worker/dist/index.js &
node apps/crawler/dist/index.js &

echo "📡 [STEP 3] Iniciando API principal..."
exec node apps/api/dist/server.js