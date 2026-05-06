FROM node:20-slim

RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY apps/crawler/package*.json ./apps/crawler/
COPY apps/worker/package*.json ./apps/worker/

RUN npm install

COPY prisma ./prisma/
COPY prisma.config.ts ./

RUN npx prisma generate

COPY . .

RUN npm run build

ENV NODE_ENV=production

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 3333

ENTRYPOINT ["./entrypoint.sh"]