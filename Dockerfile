# Stage 1: Build the frontend
FROM node:22-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the frontend
RUN npm run build

# Stage 2: Production image
# 2026-03-06: FROM node:22-slim AS production
# 2026-07-15: FROM ghcr.io/contrived-com/node-22-slim-visa:2026-03-07_sha-9c2c405_rt-fountain-pens-fountain-pens_tp-2823763c_iss-20260307T003101Z AS production
FROM ghcr.io/contrived-com/node-22-slim-visa:2026-07-15_sha-6c74791_rt-fountain-pens-fountain-pens_tp-3840044d_iss-20260715T065238Z AS production

WORKDIR /app

# Install git for API endpoints
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# Copy package files (for production dependencies)
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy built frontend from builder stage
COPY --from=builder /app/dist ./dist

# Copy server
COPY server.js ./

# Create data directory
RUN mkdir -p /app/data && chown -R appuser:appgroup /app

# Environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV DATA_DIR=/app/data

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:8080/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Configure git safe directory (needed because .git is mounted from host)
RUN git config --global --add safe.directory /app/repo

# Run as non-root user
USER appuser

# Start the server
CMD ["node", "server.js"]
