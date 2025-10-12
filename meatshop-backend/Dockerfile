# ============================================
# 🧩 STAGE 1 — BUILD
# ============================================
FROM node:20-alpine AS builder

# Dependências para build de pacotes nativos
RUN apk add --no-cache python3 make g++

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci
RUN npm install -g @nestjs/cli

COPY . .

# Compila o código NestJS (gera dist/)
RUN npm run build


# ============================================
# 🚀 STAGE 2 — PRODUÇÃO
# ============================================
FROM node:20-alpine

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist ./dist
COPY package*.json ./
RUN npm ci --omit=dev

ENV NODE_ENV=production \
    PORT=3001 \
    TZ=America/Sao_Paulo

EXPOSE 3001

VOLUME ["/usr/src/app/data", "/usr/src/app/logs"]

CMD ["node", "dist/main.js"]