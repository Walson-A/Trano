# Lecteurs de référence — layout, cognition et décisions pour Atlas TV

Recherche du 28 octobre 2026, après la proposition `710cc4b`. Walson demande
d'étudier les lecteurs et les raisons de leurs choix avant de poursuivre le
design. Aucun changement QML, API, serveur ou essai TV dans ce lot.

[Carnet visuel et synthèse](2026-10-28-premium-player-layouts/research.html).

## Ce qui a réellement été examiné

Les visuels et leur provenance sont conservés dans
[sources.json](2026-10-28-premium-player-layouts/sources.json). Il s'agit de
captures publiées et de documents officiels, pas de sessions manipulées dans
des comptes Netflix, Apple ou Infuse. Aucun prétendu test utilisateur de ces
applications n'est rapporté ici.

| Référence | Preuve disponible | Ce qu'elle permet de conclure |
| --- | --- | --- |
| Apple TV 4K | Bandeau annoté officiel et guide d'utilisation ; documentation AVKit/tvOS | Géométrie du bandeau et parcours des commandes sur cette plateforme |
| Netflix TV | Deux captures d'un test du 29 juillet 2026, publiées par What's on Netflix ; aide officielle | Layout de ce test et accès aux langues documenté ; pas un Netflix universel |
| Infuse | Documentation officielle des gestes Apple TV et visuel de démonstration Firecore | Parcours documenté ; plateforme du visuel non précisée, donc pas de géométrie TV déduite |
| Disney+ et HBO Max | Aide officielle par appareil | Parcours langues/retour ; géométrie complète non observée |

## Les layouts et ce qu'ils organisent

### Apple TV : séparer trois types d'information

Le [bandeau officiel](2026-10-28-premium-player-layouts/apple-tv-controls.png)
place l'identité du contenu à gauche, les réglages à droite, la timeline sur la
largeur et les entrées de contenu sous celle-ci. Son
[guide](https://support.apple.com/en-gb/guide/tv/atvb7944597f/tvos)
documente aussi la confirmation d'une position proposée et l'annulation qui
retrouve la position d'origine. Les gestes circulaires dépendent du Siri Remote.

Apple explique dans [sa présentation tvOS](https://developer.apple.com/videos/play/wwdc2021/10191/)
que la barre rassemble les options de lecture et que les onglets donnent accès
aux informations ou au contenu connexe sans quitter le lecteur. La
[documentation AVKit](https://developer.apple.com/documentation/avkit/customizing-the-tvos-playback-experience)
distingue explicitement titre, contrôles, menus et onglets.

**Lecture de design pour Atlas :** « ce que je regarde », « comment je le lis »
et « quel épisode choisir » sont des fonctions distinctes. Leur séparation
visuelle peut aider à s'orienter ; elle ne prouve pas que cette disposition
sera plus rapide sur notre appareil.

### Netflix : groupe compact et actions contextuelles

Les [commandes](2026-10-28-premium-player-layouts/netflix-controls.png) du
[test observé](https://www.whats-on-netflix.com/news/first-look-netflix-new-tv-video-player-redesign/)
sont groupées à gauche au-dessus de la progression, avec une action textuelle
plus saillante et des icônes secondaires. Le
[menu de langues](2026-10-28-premium-player-layouts/netflix-audio.png) utilise des
zones nommées et garde une partie de la vidéo visible.
L'[aide officielle](https://help.netflix.com/en/node/372) confirme l'accès aux
langues pendant la lecture, avec des variations selon l'appareil.

**Hypothèse pour Atlas :** réduire la dispersion des commandes et la concurrence
avec l'image. Ce n'est pas une preuve de l'intention des concepteurs de ce test,
ni une obligation de reproduire toutes ses icônes. Nos choix de site/hébergeur
ajoutent une tâche spécifique absente de ces captures.

### Infuse : transférer un parcours, pas une barre d'une autre plateforme

Le [guide officiel](https://support.firecore.com/hc/en-us/articles/215090987-Playback-Controls)
décrit sur Apple TV les gestes directs de lecture et l'accès aux options par
un balayage vers le bas. Le
[visuel officiel examiné](2026-10-28-premium-player-layouts/infuse-unqualified-platform.jpg)
montre une barre flottante, un volume et des commandes de fenêtre. Sa plateforme
n'est pas identifiée : **il est écarté comme preuve de layout TV**.
L'[annonce Infuse 8](https://firecore.com/blog/infuse-8-now-available) présente
des contrôles conçus pour accéder aux options courantes, mais couvre plusieurs
plateformes. La transposition d'une barre desktop vers Devialet resterait injustifiée.

### Disney+ / HBO Max : vérifier les différences plutôt qu'inventer un standard

Les pages Disney+ [langues](https://help.disneyplus.com/en-GB/article/disneyplus-en-id-video-language)
et [formatage](https://help.disneyplus.com/en-GB/article/disneyplus-en-id-format-captions)
donnent des positions différentes selon le contexte et l'appareil. Je n'en
déduis donc pas une géométrie unique. L'aide
[HBO Max](https://help.hbomax.com/us-en/Answer/Detail/000002515) documente, sur TV,
pause → langues/sous-titres → Retour et la réutilisation de la langue préférée
lorsqu'elle est disponible. Ces parcours confirment l'importance du retour au
contenu ; ils ne valident pas nos menus.

## La partie cognitive : preuves, recommandations et inférences

| Mécanisme | Ce que la source soutient | Conséquence proposée pour Atlas |
| --- | --- | --- |
| Reconnaissance plutôt que rappel | Les indices visibles facilitent la récupération d'information ; recommandation UX expliquée par [NN/g](https://www.nngroup.com/articles/recognition-and-recall/) | Titres d'épisodes, état de lecture et libellés aident à choisir sans mémoriser des numéros ou symboles |
| Sens des icônes appris | [NN/g](https://www.nngroup.com/articles/icon-usability/) distingue un dessin reconnaissable d'une fonction compréhensible et recommande des libellés | « Source » ne devrait pas reposer sur un écran dessiné ; son nom doit être visible quand les contrôles le sont |
| Priorisation des décisions | La [divulgation progressive](https://www.nngroup.com/articles/progressive-disclosure/) reporte les options spécialisées, en gardant les fonctions fréquentes accessibles | Ne pas cacher Source et Qualité : Walson les considère prioritaires. Leur fréquence dans notre usage compte plus que leur présence chez Netflix |
| Continuité du repère | Les [consignes de focus Apple](https://developer.apple.com/design/human-interface-guidelines/focus-and-selection/) déconseillent les déplacements imprévus et distinguent focus/sélection | Focus stable après chargement ; coche pour l'état confirmé ; fermeture d'un menu revenant à sa commande |
| Possibilité d'annuler | La [recommandation de contrôle utilisateur](https://www.nngroup.com/articles/user-control-and-freedom/) valorise les sorties et actions réversibles | Retour annule la préparation ou le curseur sans quitter l'épisode ni perdre la position |

Ce tableau relie des recommandations à notre parcours. Il ne mesure pas un gain
de vitesse, une émotion ou une rétention pour Atlas.

### Ce que l'esthétique permet réellement d'affirmer

L'[expérience de Tractinsky, Katz et Ikar (2000)](https://cris.bgu.ac.il/en/publications/what-is-beautiful-is-usable-2/)
utilise un simulateur de distributeur bancaire, avec jugements avant/après usage.
Elle relie esthétique et facilité **perçue**, et observe un effet de l'esthétique
sur ces jugements. Elle ne montre pas qu'un effet de verre améliore la performance
d'un lecteur TV. Pour Atlas, finition et réussite des gestes doivent donc être
évaluées séparément.

### Pourquoi les essais doivent utiliser notre télécommande

L'[étude d'Im (2018, publication en ligne 2019)](https://www.jesk.or.kr/archive/detail/121)
compare deux types de télécommande auprès de 20 personnes, sur cinq tâches,
avec une TV de 50 pouces à 2 m. Les résultats varient avec la tâche ; pour
« Play », aucune différence significative de temps n'est détectée
(p = 0,244). Cela ne démontre pas leur équivalence et ne choisit pas notre layout.
Cette étude motive surtout un test situé, plutôt qu'une généralisation depuis
un pointeur, une souris ou une capture.

Les [consignes Android TV](https://developer.android.com/training/tv/playback/controls)
constituent aussi une référence de gestes au pavé directionnel. Elles ne disent
pas que Devialet est Android TV. Agrandir un bouton n'enlève pas les appuis
nécessaires pour l'atteindre : le trajet de focus doit être évalué lui aussi.

## Décisions de recherche pour la prochaine proposition

1. Conserver l'identité du contenu et la progression comme repères.
2. Distinguer la navigation de contenu (Épisodes) des paramètres de lecture
   (Version, Source, Qualité), au lieu de quatre icônes de même poids.
3. Donner un nom visible aux fonctions ambiguës. Compact ne signifie pas muet.
4. Montrer le choix effectif après changement, avec un état de préparation distinct.
5. Garder les paramètres importants de Walson au premier niveau des contrôles.
6. Préserver le contexte : ouvrir Épisodes ne stoppe pas la vidéo, Retour ne
   sort pas accidentellement et un échec laisse une autre source accessible.
7. Utiliser les métadonnées réellement disponibles. Ne pas inventer de vignettes
   de seek, de formats, de titres ou d'actions « Passer l'intro ».

L'architecture Apple et celle du test Netflix sont deux hypothèses comparables,
pas deux thèmes à superposer. Pour Atlas, je privilégie désormais **la séparation
fonctionnelle d'Apple**, avec une densité contenue et des libellés adaptés à nos
sources. Ce choix est une décision de design à éprouver, pas une conclusion scientifique.

## Comment départager les layouts

Comparer le même contenu et les mêmes données, puis faire cinq tâches sans aide :
pause/reprise ; chercher une position puis annuler ; changer VF/VOSTFR ; choisir
une qualité puis vérifier l'état effectif ; récupérer une erreur via un autre
lecteur. Ajouter l'accès à un épisode éloigné et le retour à l'épisode courant.

Relever premier choix correct, appuis nécessaires, erreurs de Retour, perte du
focus/contexte, position et état pause conservés, lisibilité à la distance réelle.
Le jugement esthétique reste demandé séparément. Aucun « score premium » ou
layout optimal n'est déduit de ces sources. Aucun de ces essais n'a été exécuté
sur la TV dans ce travail de recherche.
