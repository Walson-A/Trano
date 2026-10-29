# Bibliothèque et densité : reprendre les usages PC et mobile

## Réception et correction immédiate

La première Recherche publiée, hero-discovery-6f378d98928e, compte 24 résultats
par page et quatre grandes affiches visibles. Walson l’apprécie puis demande si
quatre suffisent pour découvrir et souhaite les actions de liste/notation du
PC et du téléphone.

La passe suivante hero-discovery-0c63b10e2171 montrait douze petites cartes paysage.
Elle est **rejetée par Walson** : cartes et images jugées très mauvaises.
Les bannières rognées, les replis en affiche minuscule et la réduction de la
surface d’image dégradaient la découverte malgré le nombre supérieur de résultats.
La réussite des tests n’en faisait pas une bonne composition.

La configuration précédente est restaurée sous verrou et comparaison des octets,
puis atlas-tv-launch redémarré et sa disponibilité vérifiée. **6f378d98928e est
relancée sur le Devialet**, SDK accepté, sans épisode ni modification du lecteur.
La [preuve de retour arrière](2026-10-29-atlas-tv-library-density/rollback.json)
et la [publication refusée](2026-10-29-atlas-tv-library-density/rejected-deployment.json) distinguent les
états historiques. Les backups privés sont conservés pour rollback.

## Nouvelle proposition, pas publiée

Le [comparatif QML](2026-10-29-atlas-tv-library-density/review.html) présente les
quatre affiches actuelles, la passe refusée et six **grandes affiches verticales**.
Le panneau latéral libère deux colonnes. Les images utiles passent de 182×256 à
166×234 dans le référentiel1280×720 : réduction d’environ9% de largeur, proportions
conservées, plutôt que des têtes recadrées en vignettes. La police des titres
reste17px sur deux lignes ; le titre ciblé et ses métadonnées apparaissent
au-dessus de la grille. OK garde l’accès à la fiche et son résumé complet.

Six affiches sont visibles en entier, la rangée suivante est perceptible.
La pagination reste24, le cache garde deux travaux simultanés et un préchargement
borné. Aucun chiffre de visibilité n’est un optimum scientifique. Cette proposition
attend le jugement de Walson sur image avant une nouvelle publication.

Le paramètre denseLayout du composant réel est désactivé par défaut et **le
loader réel ne l’active pas**. Le banc seul l’active avec --dense. Ses 32 contrôles
passent en 6 colonnes, dont filtre brouillon/annulation, réponse périmée, pagination,
fiche et retour, rangée finale incomplète et recalage sans flèche supplémentaire.
Le transport est simulé avec 48 vraies cartes PC et leurs affiches localisées ; ce
n’est pas un classement vivant. Pas de nouvelle validation native pour cette
composition. La qualité depuis le canapé reste à juger.

Références de raisonnement : [reconnaître plutôt que devoir se rappeler](https://www.nngroup.com/articles/recognition-and-recall/)
et [indices permettant d’évaluer une destination](https://www.nngroup.com/articles/information-scent/).
L’application à six affiches est notre hypothèse de design ; ces sources ne
prescrivent ni ce nombre ni cette géométrie TV.

## Inventaire du code existant

Lecture directe des sources PC/mobile du checkout Atlas, sans modification de
ces applications ni déduction sur les builds actuellement installés.

| Usage | PC | Mobile | Adaptation TV proposée |
| --- | --- | --- | --- |
| Ma liste | Hero ajoute en À voir ; si déjà présent ouvre la fiche | Carte/fiches portent le moi de l’engine | Action Ajouter à ma liste sur fiche, puis statut réel ; jamais déduire « absent » d’une carte publique sans moi |
| Statut | En cours, À voir, Terminé, En pause, Abandonné, À revoir | Pas de sélecteur de six statuts dans la surface inspectée | Menu court dans Mon suivi, avec valeur appliquée distincte du focus |
| Note | Sur 10, demi-point, conserve une décimale existante comme 7,2 ; retrait possible | Feuille sur 10 par demi-point, Enregistrer | Gauche/droite prépare la note ; Enregistrer confirme ; Retour abandonne sans requête |
| Progression | Épisode vu, plus/moins, dernier épisode termine ; Revoir depuis le début | Vu jusqu’ici appelle anime/maj avec statut adapté | ÉpisodeN/total et action explicite, séparée de la simple consultation d’une fiche |
| Avis | Notes AniList privées, capacité dédiée et confirmation moi.prive | Feuille note et avis | Composer sur téléphone est à privilégier ; ne pas inventer une saisie TV confortable ni une confidentialité non confirmée |

Sources utiles : LifeOS/src/components/animes/NoteurAnime.tsx, Hero.tsx,
format.ts, ecritures.ts et corrections.ts ; LifeOS/docs/animes-ui.md ;
AtlasMobile/src/screens/AnimeScreen.tsx, src/api/animes.ts et docs/animes.md.

Sur PC, noter un animé absent de la liste le range aussi en Terminé ; ce comportement
doit être rendu compréhensible avant de le reprendre sur TV. Une note ne doit pas
faire croire qu’un épisode a été lu. « Terminé » et « À revoir » modifient aussi la
progression sur PC ; la TV devra garder ces effets explicites.

Les écritures PC d’un même animé sont ordonnées et les corrections utilisent le
moi confirmé, avec protection contre un état plus ancien. Le mobile relit également
le moi confirmé par anime/maj. La TV doit partager cette vérité par identité AniList,
afficher un état d’enregistrement et conserver les choix après échec. Aucune liste
parallèle locale ni sauvegarde fictive ne constitue une synchronisation.

## Ce qui manque réellement côté TV

La conversation backend a vérifié les sources dev : les routes catalogue TV
exposent home, detail, episodes, search, history et leurs compléments. **Aucune
route appareil n’expose anime/maj, les notes ou les statuts.** Le RPC propriétaire
existe, mais ne doit pas être appelé directement avec un credential propriétaire
copié sur le Player.

Le lot suivant devra définir une route appareil fermée et une capability dédiée :
identité stricte, champs note/statut/progression bornés, autorité du compte AniList
et réponse moi confirmée. Les avis privés ont leur contrainte séparée. Pas d’URL,
de méthode RPC ou de credential arbitraire depuis le QML. Le parcours TV peut
être préparé avec un adaptateur explicite au banc ; aucune mutation de la vraie
liste AniList de Walson n’a été faite pour cette étude.

Ordre proposé : ajouter/consulter Ma liste, gérer statut et progression, puis
notation depuis la fiche. Les boutons d’écriture ne seront livrés qu’une fois
le contrat branché et les erreurs traitées ; ce document ne les présente pas
comme disponibles aujourd’hui sur la TV.

## Ménage

Les exports/replays intermédiaires locaux de ce lot sont retirés après archivage
des preuves. Le worktree feat/local-network reste pour la revue ; le cache des 48
affiches et les polices partagées restent pour reproduire le banc. Les deux travaux
non suivis préexistants devialet/tv/ et preview-atlas-tv-home.py sont préservés.
Le paquet actif, les deux versions précédentes et les backups privés serveur
restent disponibles pour rollback ; aucune suppression des travaux backend HLS.
