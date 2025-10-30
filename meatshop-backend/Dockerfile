# ============================================
# STAGE 1 — BUILD
# ============================================
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY tsconfig*.json ./
COPY src ./src

# Compila o código NestJS para /dist
RUN npm run build


# ============================================
# STAGE 2 — PRODUÇÃO
# ============================================
FROM node:20-alpine AS runtime

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /usr/src/app/dist ./dist

USER node

ENV NODE_ENV=production \
    PORT=3001 \
    TZ=America/Sao_Paulo

EXPOSE 3001

VOLUME ["/usr/src/app/data", "/usr/src/app/logs"]

# Comando final de execução
CMD ["node", "dist/main.js"]
