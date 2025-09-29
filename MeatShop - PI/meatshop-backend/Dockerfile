FROM node:20
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3001
VOLUME ["/usr/src/app/data"]
ENV PORT=3001
CMD ["node", "dist/main.js"]