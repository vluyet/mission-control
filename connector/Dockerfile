FROM node:20-alpine
WORKDIR /srv
COPY package.json ./
COPY server.mjs ./
EXPOSE 18790
CMD ["node", "server.mjs"]
