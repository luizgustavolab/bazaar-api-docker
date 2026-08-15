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

# Worker e Crawler não rodam mais no Render: o Cloudflare desafia a rede do
# Render e bloqueia o scraping. O crawl diário agora roda via GitHub Actions
# (.github/workflows/crawl.yml), gravando direto no Turso. Este container só
# serve a API para o frontend.
echo "🚀 Starting API..."
exec node apps/api/dist/server.js