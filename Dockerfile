# ---- Build Stage ----
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

# ---- Production Stage ----
FROM node:20-slim
WORKDIR /app
COPY --from=build /app /app
# Install Playwright browsers
RUN npx playwright install --with-deps chromium
ENV NODE_ENV=production
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1
CMD ["npm", "start"] 