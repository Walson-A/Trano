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

## Livraison vérifiée

Trano 1.2.36 : commits `6fef030` et `0472bfc`, workflows
[lot principal](https://github.com/Walson-A/Trano/actions/runs/38440779228) et
[suivi de connexion](https://github.com/Walson-A/Trano/actions/runs/38442569615)
réussis, y compris l'étape de déploiement. Image exécutée :
`sha256:db4378e6dcac1c45c909f84d153fd575d2ae936abf24df404f1031d9538bef3f`.
Les empreintes SHA-256 des trois sources serveur (outils, chat et MCP) ont été
comparées à leur contenu Git canonique : concordance. La source web n'est pas
dans l'image finale ; la CI compile et livre son bundle.

Le MCP réel exige le logement dans tous les schémas scoped et annote les
lectures. Une commande sans home et une commande sur `light.lumiere` depuis
main renvoient `isError: true`, sans changer les appareils. La lecture réelle
de main contient 13 appareils, celle d'apartment seulement LED Télé et Lumière.
TypeScript et build réussis ; revue navigateur finale rejouée après relance du
serveur de test arrêté par l'interruption. Aucun « éteins tout » n'a été envoyé
aux appareils réels : l'exécution de groupe est vérifiée contre les services simulés.
