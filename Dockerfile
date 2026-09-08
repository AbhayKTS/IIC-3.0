# ---- Backend: Cloud Run ----
FROM node:20-slim AS backend

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Install production deps only
RUN npm install --omit=dev --ignore-scripts --legacy-peer-deps

# Copy backend source
COPY src/ ./src/
COPY docs/openapi.yaml ./docs/openapi.yaml

# Cloud Run sets PORT env var automatically
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "src/server.js"]
