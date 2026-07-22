# Image Trano publiée sur GHCR par la CI, puis simplement téléchargée par
# Home Assistant (voir addon/trano/config.yaml, champ `image`).
#
# Le frontend est compilé EN AMONT par la CI, nativement en x86 : l'image
# ne fait qu'installer les dépendances de production et embarquer le
# résultat. Sans ça, l'étape arm64 (émulée) compilerait le frontend sous
# QEMU — plusieurs fois plus lent, pour un résultat identique.
#
# Aucune compilation native ici : la base de données passe par le module
# node:sqlite intégré à Node, et tsx/esbuild sont des binaires précompilés.
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV TRANO_DB_PATH=/data/trano.db
# La VM Home Assistant de la Freebox Delta plafonne à ~1 Go, dont HA
# consomme déjà l'essentiel. On borne le tas de Node pour que Trano ne
# puisse jamais grignoter la mémoire au point d'étouffer HA : mieux vaut
# que Trano échoue seul plutôt qu'il emporte la domotique avec lui.
ENV NODE_OPTIONS=--max-old-space-size=128

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
RUN npm ci --omit=dev

COPY packages ./packages
COPY apps/server ./apps/server
COPY apps/web/dist ./apps/web/dist
COPY deploy/start-addon.mjs ./start-addon.mjs

EXPOSE 3001
CMD ["node", "start-addon.mjs"]
