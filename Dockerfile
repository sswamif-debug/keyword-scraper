FROM mcr.microsoft.com/playwright:v1.52.0-noble

WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY server.js ./
COPY already_done.json ./

# Force Playwright browsers into a shared location accessible by all users
ENV PLAYWRIGHT_BROWSERS_PATH="/opt/playwright-browsers"
RUN npx playwright install --with-deps chromium \
    && chmod -R o+rx /opt/playwright-browsers

EXPOSE 3000
CMD ["node", "server.js"]
