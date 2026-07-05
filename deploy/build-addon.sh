#!/usr/bin/env bash
# Prépare le dossier de l'add-on HAOS :
#   1. build du frontend sur le PC (bundle moderne + bundle legacy iPad),
#   2. copie du serveur (sources tsx) et du build web dans
#      deploy/ha-addon/trano/app/.
# La Freebox n'a plus qu'à installer les dépendances de production.
# Voir deploy/README.md pour l'installation sur la Freebox.
set -euo pipefail

cd "$(dirname "$0")/.."
DEST="deploy/ha-addon/trano/app"

echo "→ Build du frontend…"
npm run build

echo "→ Copie des fichiers de l'add-on…"
rm -rf "$DEST"
mkdir -p "$DEST/apps/web" "$DEST/packages"

cp package.json package-lock.json "$DEST/"
cp -r packages/shared "$DEST/packages/shared"
cp -r apps/server "$DEST/apps/server"
cp -r apps/web/dist "$DEST/apps/web/dist"
cp apps/web/package.json "$DEST/apps/web/"

# Jamais de node_modules, de données locales ni de secrets dans l'add-on
find "$DEST" -name node_modules -type d -prune -exec rm -rf {} + 2>/dev/null || true
rm -rf "$DEST/apps/server/data"
rm -f "$DEST"/apps/server/.env*

echo "✅ Add-on prêt dans deploy/ha-addon/trano/"
echo "   → Copiez ce dossier dans \\\\homeassistant.local\\addons (voir deploy/README.md)"
