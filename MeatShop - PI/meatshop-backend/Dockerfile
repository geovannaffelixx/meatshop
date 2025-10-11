# Etapa 1 - Build
FROM node:20 AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
RUN npm install -g @nestjs/cli
COPY . .
RUN npm run build

# Etapa 2 - Produção
FROM node:20
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/dist ./dist
COPY package*.json ./
RUN npm install --omit=dev
EXPOSE 3001
ENV PORT=3001
CMD ["node", "dist/main.js"]