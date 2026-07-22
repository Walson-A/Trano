#!/usr/bin/env bash
# Publie l'add-on prêt-à-l'emploi sur la branche `release` (dont la racine
# EST l'add-on : config.yaml, Dockerfile, app/ déjà compilé). C'est cette
# branche que Home Assistant lit directement sur GitHub — après le premier
# ajout du dépôt dans HA, chaque exécution de ce script fait apparaître un
# bouton « Mettre à jour » dans l'add-on, sans jamais retoucher à un
# partage réseau.
#
# Ne touche jamais à la branche de développement en cours : tout se passe
# dans un worktree jetable (dossier temporaire lié au même dépôt git).
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Build de l'add-on…"
bash deploy/build-addon.sh

SRC="deploy/ha-addon/trano"
WT=".release-worktree"

git worktree prune
rm -rf "$WT"

if git show-ref --verify --quiet refs/heads/release || git ls-remote --exit-code --heads origin release >/dev/null 2>&1; then
  git worktree add "$WT" release
else
  git worktree add --detach "$WT"
  git -C "$WT" switch --orphan release
fi

# Repart d'une page blanche puis recopie le contenu frais de l'add-on
find "$WT" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -r "$SRC"/. "$WT"/

cat > "$WT/repository.yaml" <<EOF
name: Trano
url: https://github.com/Walson-A/Trano
maintainer: Walson-A
EOF

# Auto-incrémente le patch de version : Home Assistant ne propose la mise
# à jour que si le numéro change, donc plus besoin d'y penser à la main.
CURRENT=$(sed -n 's/^version: "\(.*\)"/\1/p' "$WT/config.yaml")
MAJ=${CURRENT%%.*}; REST=${CURRENT#*.}; MIN=${REST%%.*}; PATCH=${REST#*.}
NEW="$MAJ.$MIN.$((PATCH + 1))"
sed -i "s/version: \"$CURRENT\"/version: \"$NEW\"/" "$WT/config.yaml"
sed -i "s/version: \"$CURRENT\"/version: \"$NEW\"/" "$SRC/config.yaml"

git -C "$WT" add -A
git -C "$WT" commit -q -m "release: Trano v$NEW"
git -C "$WT" push -q origin release

git worktree remove "$WT" --force

echo "✅ v$NEW publiée sur la branche 'release' — Home Assistant proposera la mise à jour."
