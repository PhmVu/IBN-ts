# Production Dockerfile with TypeScript runtime
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies for ts-node)
RUN npm ci

# Copy source code
COPY src ./src

# Copy JWT keys
COPY keys ./keys

# Expose port
EXPOSE 9002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:9002/api/v1/health || exit 1

# Start with ts-node (TypeScript runtime)
CMD ["npx", "ts-node", "-r", "tsconfig-paths/register", "src/index.ts"]
