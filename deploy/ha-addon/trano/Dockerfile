# Add-on HAOS Trano.
# Le dossier app/ (serveur + build web DÉJÀ compilé) est généré par
# deploy/build-addon.sh sur le PC avant l'installation : la Freebox
# n'installe que les dépendances de production — pas de build Vite sur
# place, installation bien plus rapide et sans risque de manque de RAM.
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV TRANO_DB_PATH=/data/trano.db
COPY app/package.json app/package-lock.json ./
COPY app/apps/web/package.json apps/web/
COPY app/apps/server/package.json apps/server/
COPY app/packages/shared/package.json packages/shared/
RUN npm ci --omit=dev
COPY app/ .
COPY start-addon.mjs ./start-addon.mjs
CMD ["node", "start-addon.mjs"]
