FROM node:20

WORKDIR /usr/src/app

# Copia package.json e instala dependências
COPY package*.json ./
RUN npm install

# Copia o código-fonte e a pasta public separadamente
COPY . .
COPY public ./public

# Gera o build de produção
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
