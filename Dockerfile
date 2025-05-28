
# Use Node.js 20 Alpine image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies for native modules and build tools
RUN apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build frontend with Vite
RUN npx vite build

# Verify build output
RUN ls -la dist/ && ls -la dist/index.html

# Expose port
EXPOSE 5000

# Set environment to production
ENV NODE_ENV=production

# Start the application using tsx directly
CMD ["npx", "tsx", "server/index.ts"]
