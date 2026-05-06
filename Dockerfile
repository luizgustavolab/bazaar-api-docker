FROM node:20-slim

# Instalamos apenas o necessário para o Prisma e Turso funcionarem
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiamos as definições de pacotes primeiro para aproveitar o cache
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/crawler/package*.json ./apps/crawler/
COPY apps/worker/package*.json ./apps/worker/

# Instalamos todas as dependências (incluindo devDependencies para o build)
RUN npm install

# Copiamos o schema e geramos o Client ANTES de copiar o resto do código
COPY prisma ./prisma/
RUN npx prisma generate

# Agora copiamos o código fonte e rodamos o build
COPY . .
RUN npm run build

# Definimos para produção
ENV NODE_ENV=production

# Permissão para o script de inicialização
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3333

ENTRYPOINT ["./entrypoint.sh"]