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

# Version de référence = celle DÉJÀ PUBLIÉE sur `release`, pas celle du
# code source : la CI ne réécrit jamais les sources, donc s'y fier
# republierait éternellement le même numéro — et Home Assistant, qui ne
# détecte une nouveauté qu'au changement de numéro, ne proposerait jamais
# aucune mise à jour. On retombe sur les sources au tout premier passage.
PREV="$WT/trano/config.yaml"
[ -f "$PREV" ] || PREV="$WT/config.yaml"   # ancienne mise en page, add-on à la racine
[ -f "$PREV" ] || PREV="$SRC/config.yaml"  # première publication
CURRENT=$(sed -n 's/^version: "\(.*\)"/\1/p' "$PREV")

# Repart d'une page blanche, puis recopie l'add-on DANS UN SOUS-DOSSIER :
# le Supervisor cherche les add-ons via le motif `**/config.*`, et exige
# repository.yaml seul à la racine. Un add-on posé à la racine n'est pas
# détecté (il n'apparaîtrait jamais dans la boutique).
find "$WT" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
mkdir -p "$WT/trano"
cp -r "$SRC"/. "$WT/trano"/

cat > "$WT/repository.yaml" <<EOF
name: Trano
url: https://github.com/Walson-A/Trano
maintainer: Walson-A
EOF

# Incrémente le patch, puis écrit le résultat dans l'add-on publié.
MAJ=${CURRENT%%.*}; REST=${CURRENT#*.}; MIN=${REST%%.*}; PATCH=${REST#*.}
NEW="$MAJ.$MIN.$((PATCH + 1))"
sed -i "s/^version: \".*\"/version: \"$NEW\"/" "$WT/trano/config.yaml"

git -C "$WT" add -A
git -C "$WT" commit -q -m "release: Trano v$NEW"
git -C "$WT" push -q origin release

git worktree remove "$WT" --force

echo "✅ v$NEW publiée sur la branche 'release' — Home Assistant proposera la mise à jour."
