# Profils (façon Netflix)

Chaque membre de la maison a son profil. Au lancement, si aucun profil n'est
actif sur l'appareil, l'écran **« Qui est-ce ? »** s'affiche (`ProfileGate`).

## Comportement

- **Sélection** : toucher sa tuile → l'app s'ouvre avec ce profil
  (« Bonjour, Kevin », favoris personnels…).
- **Par appareil** : le profil actif est persisté en localStorage — la
  tablette du salon peut rester sur un profil « Maison » pendant que chaque
  téléphone a le sien.
- **Changer de profil** : bouton profil dans la sidebar (ou la barre mobile)
  → retour à l'écran de sélection.
- **Gérer les profils** : mode édition sur l'écran de sélection (crayon sur
  chaque tuile), création via la tuile « Ajouter ».

## Un profil contient

| Champ | Usage |
|---|---|
| `name` | Affichage, « Bonjour, X » |
| `avatar` | Emoji (24 proposés) — zéro upload, lisible par les petits |
| `color` | Couleur d'accent de la tuile et des badges |
| `roomIds` | Pièce(s) attitrée(s) — souvent la chambre ; plusieurs personnes peuvent partager une pièce, une personne peut avoir plusieurs pièces |
| `isKid` | Profil enfant : pas d'accès aux Réglages (extensible) |
| `favorites` | entity_ids d'appareils épinglés (♥ sur les DeviceCard) |
| `favoriteRooms` | ids de pièces épinglées (★ sur l'en-tête de pièce), affichées dans « Mes pièces » du dashboard et cliquables pour ouvrir la pièce |

## Synchronisation

Les profils vivent dans la base SQLite du serveur. Toute modification est
diffusée en WebSocket : créer un profil sur la tablette le fait apparaître
instantanément sur tous les autres écrans. Si le profil actif d'un appareil
est supprimé ailleurs, l'appareil retombe proprement sur l'écran de sélection.

## Fichiers

- `apps/web/src/features/Profiles/ProfileGate.tsx` — écran de sélection
- `apps/web/src/features/Profiles/ProfileEditor.tsx` — modale création/édition
- `apps/web/src/core/store/useProfileStore.ts` — store + `useActiveProfile()`
- `apps/server/src/routes/profiles.ts` — API
