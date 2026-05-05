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
# Copiamos o package.json da raiz e os arquivos de lock
COPY package*.json ./

# Copiamos a pasta prisma para gerar o client
COPY prisma ./prisma/

# 4. Instalar as dependências do monorepo e gerar o Prisma Client
RUN npm install
RUN npx prisma generate

# 5. Copiar o restante do código do projeto
COPY . .

# 6. Configurar o script de entrada
# Copia o arquivo entrypoint.sh da sua máquina para dentro da imagem
COPY entrypoint.sh ./entrypoint.sh

# Garante que o script tenha permissão de execução
RUN chmod +x ./entrypoint.sh

# 7. Expor a porta da API
EXPOSE 3333

# 8. Comando que orquestra o boot do container
# Usamos o entrypoint.sh para ligar o Redis e os serviços em paralelo
CMD ["./entrypoint.sh"]
