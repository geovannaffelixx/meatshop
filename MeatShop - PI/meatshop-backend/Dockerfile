# ============================================
# 🧩 STAGE 1 — BUILD
# ============================================
FROM node:20-alpine AS builder

# Define diretório de trabalho
WORKDIR /usr/src/app

# Copia apenas os arquivos de dependências primeiro (melhor cache)
COPY package*.json ./

# Instala todas as dependências (incluindo dev)
RUN npm ci

# Instala o Nest CLI globalmente para compilar
RUN npm install -g @nestjs/cli

# Copia o restante do código-fonte
COPY . .

# Gera o build (compila TypeScript → JavaScript)
RUN npm run build


# ============================================
# 🚀 STAGE 2 — PRODUÇÃO
# ============================================
FROM node:20-alpine

# Diretório de trabalho
WORKDIR /usr/src/app

# Copia apenas o resultado do build da stage anterior
COPY --from=builder /usr/src/app/dist ./dist
COPY package*.json ./

# Instala apenas dependências de produção
RUN npm ci --omit=dev

# Define variáveis de ambiente padrão
ENV NODE_ENV=production \
    PORT=3001 \
    TZ=America/Sao_Paulo

# Expõe a porta usada pelo backend
EXPOSE 3001

# Volumes persistentes (banco e logs)
VOLUME ["/usr/src/app/data", "/usr/src/app/logs"]

# Comando padrão de inicialização
CMD ["node", "dist/main.js"]
