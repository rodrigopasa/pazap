
# Use Node.js 20 Alpine image (explicitly specify latest LTS)
FROM node:20.19-alpine

# Set working directory
WORKDIR /app

# Install dependencies for native modules and build tools
RUN apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --verbose

# Copy source code
COPY . .

# Build frontend with Vite
RUN npx vite build

# Verify build output
RUN ls -la dist/ && test -f dist/index.html

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 5000

# Set environment to production
ENV NODE_ENV=production

# Start the application using tsx directly
CMD ["npx", "tsx", "server/index.ts"]
