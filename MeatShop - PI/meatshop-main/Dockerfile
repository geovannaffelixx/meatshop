# ============================================
# 🧩 STAGE 1 — BUILD
# ============================================
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copia apenas os arquivos de dependências primeiro (melhor cache)
COPY package*.json ./

# Instala dependências (incluindo dev)
RUN npm ci

# Copia todo o código-fonte
COPY . .

# Gera o build de produção do Next.js
RUN npm run build


# ============================================
# 🚀 STAGE 2 — PRODUÇÃO
# ============================================
FROM node:20-alpine

WORKDIR /usr/src/app

# Copia apenas o resultado final (build estático e configs)
COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/package*.json ./

# Instala só dependências de produção
RUN npm ci --omit=dev

# Define variáveis de ambiente padrão (pode ser sobrescrito no docker-compose)
ENV NODE_ENV=production \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1 \
    TZ=America/Sao_Paulo

EXPOSE 3000

# Comando de inicialização
CMD ["npm", "start"]
