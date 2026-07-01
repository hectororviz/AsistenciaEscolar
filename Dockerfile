FROM node:20-bookworm-slim AS backend-build
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json* ./
RUN npm install
COPY backend/prisma ./prisma
RUN npx prisma generate
COPY backend/ ./
RUN npm run build
RUN npx tsc --outDir dist-prisma --rootDir prisma prisma/seed.ts --module commonjs --target es2021 --esModuleInterop --skipLibCheck

FROM node:20-bookworm-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends iproute2 ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY backend/package.json backend/package-lock.json* ./
RUN npm install --omit=dev

COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-build /app/backend/prisma ./prisma
COPY --from=backend-build /app/backend/dist-prisma/seed.js ./prisma/seed.js
COPY --from=frontend-build /app/frontend/dist ./public

COPY docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
