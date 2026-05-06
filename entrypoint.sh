#!/bin/sh
set -e

# Exporta para garantir que qualquer processo filho veja a variável
export DATABASE_URL="$TURSO_DATABASE_URL"

echo "🔄 [STEP 1] Sincronizando Schema com Turso..."
# No Prisma 7, a flag --url supre a falta da url no schema.prisma
npx prisma db push --accept-data-loss --url "$TURSO_DATABASE_URL"

echo "🚀 [STEP 2] Iniciando Serviços de Background..."
# Rodando em background
node apps/worker/dist/index.js &
node apps/crawler/dist/index.js &

echo "📡 [STEP 3] Iniciando API principal..."
# exec substitui o shell pelo processo do node, ideal para logs e sinais do Docker
exec node apps/api/dist/server.js