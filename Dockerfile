# Production Multi-stage Build
FROM node:20-alpine AS base

# Install dependencies for building native modules
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies
RUN npm ci --include=dev && npm cache clean --force

# Build stage
FROM base AS builder

# Copy source code
COPY src/ ./src/
COPY frontend/ ./frontend/

# Build TypeScript
RUN npm run build

# Build frontend
WORKDIR /app/frontend
RUN npm ci --only=production && npm run build

# Production stage
FROM node:20-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache dumb-init sqlite

# Create non-root user
RUN addgroup -g 1001 -S qwen && \
    adduser -S qwen -u 1001 -G qwen

WORKDIR /app

# Copy built application
COPY --from=builder --chown=qwen:qwen /app/dist ./dist
COPY --from=builder --chown=qwen:qwen /app/frontend/dist ./public

# Copy production node_modules
COPY --from=builder --chown=qwen:qwen /app/node_modules ./node_modules

# Copy package files
COPY --chown=qwen:qwen package*.json ./

# Create necessary directories
RUN mkdir -p /app/data /app/logs /app/config && \
    chown -R qwen:qwen /app

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Switch to non-root user
USER qwen

# Use dumb_init to handle signals properly
ENTRYPOINT ["dumb_init", "--"]

# Start the application
CMD ["node", "dist/index.js"]