# 1. Base Node 20 slim
FROM node:20-slim

# Instalar dependências: openssl para o Prisma e o servidor Redis
RUN apt-get update && apt-get install -y \
    openssl \
    redis-server \
    && rm -rf /var/lib/apt/lists/*

# 2. Diretório de trabalho
WORKDIR /app

# 3. Copiar arquivos de dependências e schema do Prisma
COPY package*.json ./
COPY prisma ./prisma/

# 4. Instalar as dependências e gerar o Prisma Client
RUN npm install
RUN npx prisma generate

# 5. Copiar o restante do código do projeto
COPY . .

# --- ADICIONE ESTA LINHA AQUI ---
# 6. Compilar o TypeScript para gerar as pastas /dist
RUN npm run build
# --------------------------------

# 7. Configurar o script de entrada
RUN chmod +x ./entrypoint.sh

# 8. Expor a porta da API
EXPOSE 3333

# 9. Comando que orquestra o boot do container
CMD ["./entrypoint.sh"]