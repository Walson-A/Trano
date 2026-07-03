# Liste de courses

Liste partagée par toute la famille, pensée pour être utilisable par les
plus petits comme les plus vieux : une ligne d'ajout, des gros pictos de
catégories, cocher = un tap.

## Fonctionnalités

- **Qui a écrit quoi** : chaque article porte l'avatar de son auteur ;
  un article coché indique « par Kevin ».
- **Catégories** : alimentaire, maison, hygiène, vêtements, loisirs, autre —
  sélection par picto à l'ajout, filtres en haut de liste.
- **Récurrence** : « chaque semaine / toutes les 2 semaines / chaque mois ».
  Un article récurrent coché part dans « Achetés » avec sa date de retour
  (« reviendra le 10 juil. ») puis réapparaît automatiquement dans la liste.
- **Achetés** : section repliable ; décocher remet l'article dans la liste,
  la poubelle supprime définitivement.
- **Temps réel** : ajouter un article depuis un téléphone le fait apparaître
  immédiatement sur la tablette de la cuisine (WebSocket + refetch).
- **Optimiste** : cocher/décocher répond instantanément au doigt, le serveur
  confirme derrière (rollback si erreur).

## Interface

- Vue `apps/web/src/views/Shopping.tsx`, onglet « Courses » (caddie) dans la nav.
- Store `apps/web/src/core/store/useShoppingStore.ts`.
- API + règles de récurrence : voir `docs/server_api.md` (la logique de
  transition todo ⇄ bought est côté serveur).

## Idées suites (non implémenté)

- Quantités éditables après création
- Notification quand quelqu'un part faire les courses
- Suggestions basées sur l'historique d'achats
