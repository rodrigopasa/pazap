# Use Node.js 20 Alpine image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies for native modules and build tools
RUN apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev

# Copy package files
COPY package*.json ./

# Install dependencies including tsx for runtime
RUN npm ci --omit=dev && npm install tsx pg

# Copy source code
COPY . .

# Build frontend
RUN npx vite build

# Ensure build directory exists and create symlink for production
RUN mkdir -p server/public && cp -r dist/* server/public/

# Expose port
EXPOSE 5000

# Set environment to production
ENV NODE_ENV=production

# Start the application using tsx directly (no build step for backend)
CMD ["npx", "tsx", "server/index.ts"]
