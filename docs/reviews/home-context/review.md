# Connexion et contexte du logement — revue du 13 octobre 2026

La capture utilisateur montrait « HA déconnecté » et aucune météo alors que les
appareils étaient disponibles par REST. La barre conserve son sélecteur et
affiche maintenant « HA · Connecté via Trano » après une réponse réelle du
connecteur. Le pictogramme et la météo restent lisibles à 1440 × 960.

- [Maison, connexion via serveur](main-connected.png) : libellé explicite,
  température présente, aucune superposition avec le sélecteur ou les actions.
- [Appartement, chat](apartment-chat.png) : cible sous le titre, saisie nommant
  le logement, réponse dans son propre fil. Le panneau occupe 480 px et laisse
  le reste de l'app derrière son voile. Pas de refonte du panneau dans ce lot.
- [Serveur inaccessible](main-disconnected.png) : rouge et libellé indisponible,
  aucune température ancienne présentée comme actuelle.

`apps/web/tests/home-context-browser.mjs` exerce les vrais composants avec des
réponses API isolées. Il vérifie les corps envoyés au chat pour les deux homes
et l'absence du fil Appartement dans le chat de la maison. Les données de ces
captures sont des fixtures, aucune commande n'a été envoyée à la vraie famille.

Serveur : neuf tests isolés, dont un modèle simulé qui liste les appareils de
l'appartement puis tente de commander un appareil de main. Cette tentative est
refusée et aucun service HA n'est appelé pour main. Les tests MCP vérifient
l'exigence de `home_id` dans les schémas et à l'exécution, ainsi que `isError`.
