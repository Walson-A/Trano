# Sélecteur de logement — 13 octobre 2026

L'ancien [contrôle natif](../home-context/main-connected.png) dessinait un champ
rectangulaire et un menu système à côté des contrôles arrondis de Trano.
Le nouveau bouton présente le logement avec une icône discrète et un chevron.
Le menu possède des lignes espacées, un fond sélectionné et une coche : on
retrouve le logement actif sans ajouter de texte technique.

- [Trano fermé](trano-closed.png) : contrôle intégré à la barre, libellé lisible,
  badge « Connecté » ; la précision « via Trano » reste dans l'infobulle.
- [Trano ouvert](trano-open.png) : deux logements, sélection lisible et menu
  aligné avec le bouton. Pas d'animation de surface ni de bibliothèque ajoutée.
- [Thème clair](trano-light.png) : fond opaque du menu, contraste et séparation
  des lignes conservés.
- [Widget réel](atlas-widget-open.png) : menu entièrement dans le 360 × 300,
  sans modifier les dimensions ni la région cliquable de la carte.
- [Nom long](atlas-long-label.png) : libellé tronqué dans le bouton (titre complet
  au survol), retour à la ligne dans le menu sans masquer la coche.

Le banc `apps/web/tests/home-selector-browser.mjs` utilise les vrais composants
avec API simulée. Clic, navigation fléchée, Entrée, Échap avec retour au bouton,
fermeture extérieure, sélection et limites du widget sont vérifiés. Le pont
Tauri simulé confirme les demandes enable/disable du focus ; ce n'est pas une
preuve de réception native WebView2. Les premières tentatives du banc ont été
réparées : cache sous node_modules pour éviter Babel sur les dépendances, puis
filtre des mocks limité aux chemins /api/ (les modules src/api ne sont pas des
routes serveur). Les deux thèmes Trano et les libellés longs ont été relus.

TypeScript et build passent pour Trano et Atlas ; les neuf tests serveur, le
contrat client multi-home et le parcours de chat par logement restent validés.

Livré sur main avec `63c4b3e`, Trano **1.2.37**. Le [workflow de publication et déploiement](https://github.com/Walson-A/Trano/actions/runs/38448054375) est réussi. Les deux bundles (moderne et legacy) servis en production contiennent le menu « Vos logements » et ne contiennent plus le libellé « Connecté via Trano ». Le parcours complet widget/iframe, changement de logement, commandes scoped et courses a aussi été rejoué avec les vrais composants et API simulée.
