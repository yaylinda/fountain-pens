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
FROM node:22-slim AS production

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
RUN git config --global --add safe.directory /app

# Run as non-root user
USER appuser

# Start the server
CMD ["node", "server.js"]
