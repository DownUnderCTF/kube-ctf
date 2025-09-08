FROM node:23-slim AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install dependencies
RUN corepack enable && \
    pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM joseluisq/static-web-server
COPY --from=builder /app/dist /public
EXPOSE 80
CMD [ "--page-fallback", "/public/index.html" ]