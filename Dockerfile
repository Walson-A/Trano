# Image Trano : frontend buildé + serveur Fastify.
# Fonctionne en amd64 et aarch64 (VM Freebox Delta) sans compilation native
# grâce à node:sqlite intégré à Node.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV TRANO_DB_PATH=/data/trano.db
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/server ./apps/server
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
EXPOSE 3001
CMD ["node", "node_modules/tsx/dist/cli.mjs", "apps/server/src/index.ts"]
