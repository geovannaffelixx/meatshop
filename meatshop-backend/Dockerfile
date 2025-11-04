# ============================================
# STAGE 1 — BUILD
# ============================================
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY src ./src

# Compila o projeto (usa tsconfig.build.json / Nest CLI)
RUN npm run build

# Verificação: garante que dist foi gerado (com ou sem /src)
RUN if [ ! -f "dist/main.js" ] && [ ! -f "dist/src/main.js" ]; then \
      echo "❌ ERRO: dist/main.js ou dist/src/main.js não foram gerados!"; \
      echo "Conteúdo de dist:"; ls -la dist || true; \
      exit 1; \
    fi

# ============================================
# STAGE 2 — PRODUÇÃO
# ============================================
FROM node:20-alpine AS runtime

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

# Copia os artefatos compilados
COPY --from=builder /usr/src/app/dist ./dist

USER node

ENV NODE_ENV=production \
    PORT=3001 \
    TZ=America/Sao_Paulo

EXPOSE 3001

VOLUME ["/usr/src/app/data", "/usr/src/app/logs"]

# Fallback inteligente: tenta dist/main.js; se não existir, usa dist/src/main.js
CMD sh -c 'if [ -f "dist/main.js" ]; then node dist/main.js; else node dist/src/main.js; fi'
