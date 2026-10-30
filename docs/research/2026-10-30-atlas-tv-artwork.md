# Atlas TV — affiches bloquées et reprise des images

Walson confirme la rapidité améliorée des fiches, mais signale une affiche qui
ne charge jamais pour Apothecary Diaries saison 3, puis Devilman Crybaby.
La réouverture a aidé pour la première, pas pour la seconde.

## Constat et correction client

ArtworkCache indexait sources par chaînes de nombres AniList et utilisait
Object.keys() pour évincer le premier élément au-delà de 64. JavaScript trie ces
clés numériquement : après 64 IDs supérieurs,98460 (Devilman) était immédiatement
retiré, même juste chargé. La nouvelle LRU conserve 64 identités selon leur
utilisation réelle. Les métadonnées restent bornées à 128 clés, la file à 64 et les
préparations concurrentes à 2. Une demande du titre ciblé peut passer devant une
ancienne demande en file au lieu d’être ignorée.

L’autre défaut : l’émission 200 d’un ticket rendait l’entrée fraîche pendant sa
validité, même si le vrai chargement ou décodage Image échouait ensuite. Les
composants transmettent maintenant l’URL précisément en erreur ; seule cette
version est invalidée, sans évincer un remplacement sur erreur tardive.
La reprise automatique attend 1 puis 3 secondes ; 429 attend 10 secondes. Trois échecs
arrêtent la reprise automatique et imposent un délai de 60 s avant une nouvelle
demande normale. Les intérêts périmés sont abandonnés, sans minuteur permanent.
Les réponses après perte de session ne ressuscitent pas le cache.

Le succès n’est confirmé que sur Image.Ready avec URL non vide ; un QUrl vide
ne constitue pas une preuve de pixels décodés. Cela empêche une notification
réentrante de supprimer une reprise en attente. La bannière et les cartes ne
réécrivent plus une source réparée pendant leur callback d’erreur ; le fallback
déjà prêt conserve sa visibilité. La fiche demande aussi son poster dès son
ouverture et utilise ce poster en cache comme repli de la bannière.

## Identités et vérifications réelles

Le [backend](https://github.com/Walson-A/Atlas/blob/83013eae/docs/research/atlas-tv-artwork-2026-10-30.md)
confirme les ressources et les octets amont : 195516 est la saison 3 principale,
200927 sa Part2 de 2027 sans bannière,98460 Devilman. Les quatre ressources des
saisons principales passent 200. Les grants durent 900 s, le plafond global est 256,
et le cache disque 128 images/128MiB. Un 429 reste possible ; aucun n’a été observé
sur les quatre ressources. Il n’y a pas de preuve de corruption ni de raison
mesurée de modifier le backend dans ce lot.

[Décodage natif](2026-10-30-atlas-tv-artwork/native-images.json) par Qt sur le
Devialet, avec le cache corrigé et la vraie API, deux préparations simultanées :

| Identité | Image | Dimensions | Depuis début du lot |
| --- | --- | --- | ---: |
|195516|Poster JPEG|460×652|1626ms|
|98460|Poster PNG|460×650|1829ms|
|195516|Bannière JPEG|1900×400|1983ms|
|98460|Bannière JPEG|1900×400|2031ms|

Ces temps mesurent le lot, pas quatre RTT indépendants. Toutes les images sont
Ready, sans Image.Error. Aucun épisode ni mutation du compte. Diagnostic révoqué
et serveur temporaire fermé. Un premier paquet n’avait fourni aucune observation
native et n’est pas présenté comme un test de décodage réussi.

## Banc et revue

Le [banc du cache](2026-10-30-atlas-tv-artwork/cache-verification.json) reproduit
le petit ID après 65 grands IDs, une vraie Image.Error après émission 200, la reprise
avec la même URL, l’erreur tardive,429 et la borne de reprises, la priorité et les
callbacks invalidés. Un cas vérifie qu’un QUrl vide ne confirme rien.
Les [pixels réparés](2026-10-30-atlas-tv-artwork/recovered.png) utilisent une image
locale explicite et une API simulée, jamais un compte ni un fallback produit.

Le host complet passe en [HLS](2026-10-30-atlas-tv-artwork/hls-follow-up-verification.json)
et [MP4](2026-10-30-atlas-tv-artwork/legacy-follow-up-verification.json). Son parcours
sain résout désormais les grants fictifs vers des pixels locaux explicites, sans
DNS test.invalid dans la file du moteur image. Les erreurs réelles et la reprise
restent dans le banc dédié. Les assertions de chargement ne sont pas assouplies.
Revue des vrais composants : [fiche](2026-10-30-atlas-tv-artwork/detail-top.png),
[Recherche](2026-10-30-atlas-tv-artwork/search.png). La composition approuvée reste
la même ; les affiches, la bannière et les repères de focus sont visibles.

La reproduction en cache plein prouve un défaut du code, pas une capture de
l’état mémoire exact de Walson lors de son incident. Le succès natif prouve le
décodage, sans affirmer une réception physique de l’interface complète corrigée.

## Publication et nettoyage

Le [paquet](2026-10-30-atlas-tv-artwork/package.json) hero-artwork-20a862cdc84a,
35 fichiers / 354920 octets, provient du commit source
56410bc41f17709e90b49a844e0904f6d75289f9. Le [précontrôle](2026-10-30-atlas-tv-artwork/preflight.json)
vérifie le moteur actif 36746c754539e7d990e29092bd917b41dc11b13d et le gateway
1b6e3daa4bd74abd7db137a924df86a1f0eba0c76ed2602544ea0b778cd67134. La
[publication](2026-10-30-atlas-tv-artwork/publication.json) remplace seulement le
bundle précédent 0b0a6c8a1416, valide toutes les empreintes et ne redémarre pas
l’engine. Le [reçu SDK](2026-10-30-atlas-tv-artwork/launch.json) confirme le lancement
dd9161c20018cfcdcf01248530002364 et les 32 ressources demandées. Aucun épisode
n’est lancé automatiquement. La confirmation utilisateur des deux fiches reste
en attente ; le reçu de téléchargement ne prouve pas à lui seul leur rendu.

[Nettoyage](2026-10-30-atlas-tv-artwork/cleanup.json) : transferts serveur retirés
après vérification, bundle actif et sauvegarde privée 0600 conservés. Les exports
et paquets locaux du lot sont retirés après archivage ; aucun serveur de test
persistant ne reste. Le worktree partagé, les caches communs et ses deux éléments
non suivis préexistants sont conservés pour la suite TV, sans modification.
