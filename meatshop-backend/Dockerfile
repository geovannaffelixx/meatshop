FROM node:22-alpine AS deps

RUN apk add --no-cache python3 make g++

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

FROM deps AS builder

COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY jest.config.cjs ./
COPY src ./src

RUN npm run build

FROM deps AS production-deps

RUN npm prune --omit=dev && npm cache clean --force

FROM node:22-alpine AS runtime

WORKDIR /usr/src/app

RUN mkdir -p /usr/src/app/uploads /usr/src/app/logs /usr/src/app/data \
    && chown -R node:node /usr/src/app/uploads /usr/src/app/logs /usr/src/app/data

COPY --from=production-deps --chown=node:node /usr/src/app/node_modules ./node_modules
COPY --from=builder --chown=node:node /usr/src/app/dist ./dist
COPY --chown=node:node package*.json ./

USER node

ENV NODE_ENV=production \
    PORT=3001 \
    TZ=America/Sao_Paulo

EXPOSE 3001

CMD ["node", "dist/main.js"]
