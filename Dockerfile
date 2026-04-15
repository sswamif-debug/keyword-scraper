FROM node:20-slim

WORKDIR /app

# Install system deps needed by Playwright Chromium
RUN apt-get update && apt-get install -y \
    libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 \
    libgbm1 libasound2 libatspi2.0-0 libxshmfence1 \
    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libpango-1.0-0 libcairo2 libcups2 libx11-xcb1 \
    && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install --production

# Install matching Chromium browser
RUN npx playwright install chromium

COPY server.js ./
COPY already_done.json ./

EXPOSE 3000
CMD ["node", "server.js"]
