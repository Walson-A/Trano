# Add-on HAOS Trano.
# Le dossier app/ (sources du monorepo) est copié ici par deploy/build-addon.sh
# avant l'installation de l'add-on.
FROM node:24-alpine AS build
WORKDIR /app
COPY app/package.json app/package-lock.json ./
COPY app/apps/web/package.json apps/web/
COPY app/apps/server/package.json apps/server/
COPY app/packages/shared/package.json packages/shared/
RUN npm ci
COPY app/ .
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
COPY start-addon.mjs ./start-addon.mjs
CMD ["node", "start-addon.mjs"]
