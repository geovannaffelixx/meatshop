# ============================================
# 🧩 STAGE 1 — BUILD (Next.js)
# ============================================
FROM node:20-alpine AS builder

# Instala dependências nativas básicas (caso precise de pacotes com build)
RUN apk add --no-cache libc6-compat

WORKDIR /usr/src/app

# Copia apenas arquivos de dependências (melhor cache)
COPY package*.json ./

# Instala dependências completas (dev + build)
RUN npm ci

# Copia o código-fonte e arquivos de config
COPY . .

# Gera o build otimizado do Next.js
RUN npm run build


# ============================================
# 🚀 STAGE 2 — RUNTIME (produção)
# ============================================
FROM node:20-alpine AS runtime

WORKDIR /usr/src/app

# Copia apenas os manifestos e instala somente dependências de produção
COPY package*.json ./
RUN npm ci --omit=dev

# Copia o build gerado no estágio anterior
COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/next.config.ts ./next.config.ts
COPY --from=builder /usr/src/app/package*.json ./

# Define usuário não-root (melhor segurança)
USER node

# Define variáveis de ambiente padrão
ENV NODE_ENV=production \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1 \
    TZ=America/Sao_Paulo

EXPOSE 3000

# Volume opcional (para logs, se quiser persistir)
VOLUME ["/usr/src/app/logs"]

# Comando de inicialização
CMD ["npm", "start"]
