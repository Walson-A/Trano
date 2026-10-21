# Build from the repository root; only the relay runtime and ws are installed.
FROM node:24-alpine@sha256:6a1c190e17215d844926b0677f4bf87273ff7d5e54db06d3b5b5863ab0b09a3d
WORKDIR /app
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=48
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/server/package.json apps/server/
COPY packages/shared/package.json packages/shared/
COPY packages/lan/package.json packages/lan/
RUN npm ci --omit=dev --omit=optional --workspace=@trano/lan --include-workspace-root=false && npm cache clean --force
COPY packages/lan/src ./packages/lan/src
COPY packages/lan/devialet ./packages/lan/devialet
COPY packages/lan/scripts/gateway-health.mjs ./packages/lan/scripts/gateway-health.mjs
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD ["node", "packages/lan/scripts/gateway-health.mjs"]
ENTRYPOINT ["node", "packages/lan/src/cli.ts", "gateway"]
CMD ["--config", "/run/secrets/gateway.json"]
