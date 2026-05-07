#!/bin/sh
set -e

echo "=============================="
echo "DATABASE_URL: $DATABASE_URL"
echo "NODE_ENV: $NODE_ENV"
echo "=============================="

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL não definida"
  exit 1
fi

echo "🔄 Prisma Generate..."
npx prisma generate

echo "🚀 Starting Worker..."
# Ajustado para o caminho real gerado pelo build do TS
node apps/worker/dist/worker/src/index.js &

echo "🚀 Starting Crawler..."
# Ajustado para o caminho real gerado pelo build do TS
node apps/crawler/dist/crawler/src/index.js &

echo "🚀 Starting API..."
# O path da API permanece o mesmo pois não teve nesting profundo
exec node apps/api/dist/server.js