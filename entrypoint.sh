#!/bin/sh
set -e

echo "🔄 Prisma Push..."
npx prisma db push --accept-data-loss

echo "🚀 Starting Worker..."
node apps/worker/dist/index.js &

echo "🚀 Starting Crawler..."
node apps/crawler/dist/index.js &

echo "🚀 Starting API..."
node apps/api/dist/server.js