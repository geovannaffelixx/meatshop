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

# Copiar código-fonte e migrations
COPY src ./src
COPY migrations ./migrations

# Compilar projeto
RUN npm run build

# ============================================
# STAGE 2 — RUNTIME
# ============================================
FROM node:20-alpine AS runtime

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

# Copiar dist E migrations para runtime
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/migrations ./migrations

USER node

ENV NODE_ENV=production \
    PORT=3001 \
    TZ=America/Sao_Paulo

EXPOSE 3001

VOLUME ["/usr/src/app/data", "/usr/src/app/logs"]

CMD ["node", "dist/main.js"]
