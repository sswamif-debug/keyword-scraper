FROM node:20

WORKDIR /app

COPY package.json ./
RUN npm install --production

# Install Chromium + all system dependencies in one command
RUN npx playwright install --with-deps chromium

COPY server.js ./
COPY already_done.json ./

EXPOSE 3000
CMD ["node", "server.js"]
