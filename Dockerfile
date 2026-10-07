# Stage 1: install production dependencies
FROM node:24-bookworm-slim AS deps

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force


# Stage 2: minimal runtime image
FROM gcr.io/distroless/nodejs24-debian13:nonroot AS runtime

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY index.js ./

USER 65532

EXPOSE 3000

CMD ["index.js"]