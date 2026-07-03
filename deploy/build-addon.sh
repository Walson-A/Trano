#!/usr/bin/env bash
# Prépare le dossier de l'add-on HAOS : copie les sources du monorepo
# dans deploy/ha-addon/trano/app/ (le Dockerfile de l'add-on les build).
# Voir deploy/README.md pour l'installation sur la Freebox.
set -euo pipefail

cd "$(dirname "$0")/.."
DEST="deploy/ha-addon/trano/app"

rm -rf "$DEST"
mkdir -p "$DEST/apps/web" "$DEST/packages"

cp package.json package-lock.json "$DEST/"
cp -r packages/shared "$DEST/packages/shared"
cp -r apps/server "$DEST/apps/server"
cp -r apps/web/src "$DEST/apps/web/src"
cp -r apps/web/public "$DEST/apps/web/public"
cp apps/web/index.html apps/web/vite.config.ts apps/web/tsconfig.json apps/web/package.json "$DEST/apps/web/"

# Jamais de node_modules ni de données locales dans l'add-on
find "$DEST" -name node_modules -type d -prune -exec rm -rf {} + 2>/dev/null || true
rm -rf "$DEST/apps/server/data"

echo "✅ Add-on prêt dans deploy/ha-addon/trano/"
echo "   → Copiez ce dossier dans /addons de la VM HAOS (voir deploy/README.md)"
