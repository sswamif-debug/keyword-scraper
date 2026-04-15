FROM mcr.microsoft.com/playwright:v1.52.0-noble

WORKDIR /app

COPY package.json ./
RUN npm install --production --ignore-scripts

COPY server.js ./
COPY already_done.json ./

EXPOSE 3000
CMD ["node", "server.js"]
