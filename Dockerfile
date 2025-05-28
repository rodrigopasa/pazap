# Etapa 1 - Build do front-end
FROM node:20-alpine as build-frontend

WORKDIR /app

# Instalar dependências para build
RUN apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev

# Copiar arquivos necessários para o front
COPY package*.json vite.config.* tsconfig.* ./
COPY client ./client

WORKDIR /app/client

RUN npm ci && npm run build

# Etapa 2 - App final
FROM node:20-alpine

WORKDIR /app

# Instalar apenas runtime
RUN apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev

# Copiar dependências e instalar
COPY package*.json ./
RUN npm ci --omit=dev && npm install tsx pg

# Copiar código-fonte do backend
COPY server ./server

# Copiar build do front-end para o local onde o backend espera os arquivos
COPY --from=build-frontend /app/client/dist ./server/public

# Expor porta
EXPOSE 5000

# Variáveis de ambiente
ENV NODE_ENV=production

# Iniciar aplicação backend usando tsx
CMD ["npx", "tsx", "server/index.ts"]
