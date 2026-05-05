#!/bin/sh

# 1. Iniciar o servidor Redis em background
echo "Iniciando Redis..."
redis-server --daemonize yes

# 2. Rodar sincronização do Prisma (SQLite)
# Importante: O schema está na raiz do monorepo
echo "Sincronizando banco de dados..."
npx prisma db push --schema=./prisma/schema.prisma

# 3. Iniciar o Worker em background (usa o script da raiz)
echo "Iniciando Worker..."
npm run start:worker &

# 4. Iniciar o Crawler em background (usa o script da raiz)
echo "Iniciando Crawler..."
npm run start:crawler &

# 5. Iniciar a API em foreground (mantém o container vivo)
# Como não usamos '&', o container ficará rodando enquanto a API estiver ativa
echo "Iniciando API..."
npm run start:api