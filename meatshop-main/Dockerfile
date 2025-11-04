# ============================================
# 🧩 STAGE 1 — BUILD (Next.js)
# ============================================
FROM node:20-alpine AS builder

# Dependência mínima para pacotes binários (ex: sharp)
RUN apk add --no-cache libc6-compat

WORKDIR /usr/src/app

# Copia apenas arquivos necessários para dependências
COPY package*.json ./

# Instala dependências completas (dev + build)
RUN npm ci

# Copia todo o código-fonte
COPY . .

# Injetar variável pública no build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# Gera build otimizado do Next.js
RUN echo "📦 Building with NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}" && npm run build

# 🔥 Limpa cache e node_modules (para imagem menor)
RUN rm -rf node_modules && npm cache clean --force && rm -rf .next/cache

# ============================================
# 🚀 STAGE 2 — RUNTIME (produção)
# ============================================
FROM node:20-alpine AS runtime

WORKDIR /usr/src/app

# Copia apenas manifestos
COPY package*.json ./

# Instala dependências de produção
RUN npm ci --omit=dev && npm cache clean --force

# Copia build otimizado do estágio anterior
COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/package*.json ./

# Define usuário não root (segurança)
USER node

# Variáveis padrão
ENV NODE_ENV=production \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1 \
    TZ=America/Sao_Paulo

EXPOSE 3000

# Volume opcional para logs
VOLUME ["/usr/src/app/logs"]

# Inicializa servidor Next
CMD ["npm", "start"]
