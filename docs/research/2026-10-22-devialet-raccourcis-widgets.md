# Devialet : raccourcis, navigateur et widgets — 22 octobre 2026

## Contrainte confirmée sur le Player de Walson

Ce Devialet fonctionne sans abonnement Free associé. Il ne faut pas proposer
une opération qui suppose un FreeStore accessible ou une édition libre des
applications de l'accueil. Après retour physique à l'accueil, Walson confirme :

- aucune application Atlas, Trano relais ou de diagnostic ajoutée par nos lancements SDK ;
- pas de possibilité de modifier/ajouter les applications de l'accueil dans son interface ;
- applications visibles : YouTube, Netflix, Disney+, Prime Video, HBO Max,
  Apple TV, Spotify, Paramount+, Mes fichiers, Deezer et « R Media »
  (libellé rapporté par l'utilisateur).

La commande réseau home a répondu HTTP 200, mais Walson était encore sur YouTube.
Il suppose une sortie de veille plutôt qu'un retour immédiat à l'accueil ; cette
cause n'est pas établie. Un HTTP 200 confirme une réponse à la requête, pas le
résultat affiché. L'observation physique prévaut ; ne pas confondre ces preuves.

## Ce que prévoit le menu Favoris officiel

Dans [FS#24168](https://dev.freebox.fr/bugs/task/24168), un développeur Free
indique qu'on peut mettre en favori une app déjà sélectionnée dans la ligne
Applications via Info. Cela ne fournit ni création d'une application absente,
ni enregistrement d'une URL arbitraire hors Store. Cette condition n'est pas
satisfaite par notre application développeur sur l'accueil observé.

Le ticket historique [FS#34987](https://dev.freebox.fr/bugs/task/34987), demande
de navigateur Internet Devialet, a été fermé par Free le 4 juin 2021 comme
non prévu. Cette réponse concerne une fonctionnalité exposée normalement ;
elle ne prouve pas l'absence d'un moteur interne. Le témoignage du propriétaire
sur [le forum](https://freebox.toosurtoo.com/forum/viewtopic.php?p=169635)
porte aussi sur l'absence de raccourci web dans l'interface usuelle. Ces sources
ne remplacent pas les observations ci-dessous sur le firmware actuel.
Les deux pages officielles sont archivées dans .local/research/.

## Navigateur classique : résultat positif

Les essais antérieurs concernaient WebApp DEV Runtime et Mes téléchargements.
Ils ne doivent pas être généralisés au choix Navigateur web.

Un diagnostic QML propre à ce travail appelle :

    App.urlOpen(urlDeLaPageDeTest, "text/html")

Le Player charge alors le navigateur classique, malgré l'absence de son icône
sur l'accueil hors abonnement. Deux ouvertures ont obtenu :

- GET launcher.html reçu depuis le seul Player explicitement ciblé ;
- GET browser-ready émis par le JavaScript de notre page ;
- lors du second essai, événements ArrowUp/Down/Left/Right et Enter reçus ;
- activation physique du bouton « Test touche OK » confirmée par callback.

Le premier diagnostic ne journalisait pas les touches. Le second ne relève
que les noms de touches de navigation de sa liste fixe ; aucune saisie de texte,
aucun mot de passe ou contenu d'une autre page n'est collecté.

Le serveur temporaire n'accepte que le Player 192.168.0.30. Sa page a un fond
CSS valide, un bouton et une fonction de diagnostic. Aucun paquet tiers n'est
exécuté, aucun scan, accès au compte Free ou réglage global n'est effectué.
Les scripts et relevés sont conservés dans .local/shortcut-browser-probe.py
et .local/shortcut-browser-evidence.json, hors Git. La fin de la fenêtre ou
le marqueur d'arrêt ferme le serveur puis relance le relais permanent.

## Signets : présence confirmée, accès autonome non établi

Walson observe une barre de navigateur au démarrage, puis la retrouve dans un
panneau à gauche. Il y voit Signet et ajoute « Atlas - test raccourci » aux
favoris. Une touche Menu réseau green avait été envoyée pendant cette recherche ;
le lien causal avec l'ouverture du panneau n'a pas été confirmé. Ne pas donner
cette touche comme procédure physique prouvée.

L'ajout du signet est confirmé par le retour utilisateur. Il constate ensuite
que ce signet n'apparaît pas sur l'accueil du Player. Nous n'avons pas vérifié
sa conservation après reboot ni un accès à la liste de signets après reboot
sans lancement préalable du navigateur par le SDK.

L'adresse enregistrée pointe sur le serveur temporaire du PC. Ce signet de test
ne constitue pas un lanceur permanent et ne fonctionnera pas serveur arrêté.
Il faudra le remplacer par une adresse du serveur permanent si un point d'entrée
autonome est trouvé. Aucun endpoint de lancement supplémentaire n'a été déployé.
Le signet créé par l'utilisateur est conservé comme état de test signalé, pas
présenté comme une installation. Aucun autre signet n'a été modifié.

## Widgets : options réelles de l'accueil

Walson vérifie la zone en haut à droite et décrit précisément son contenu :

- le seul widget proposé est Config audio ; l'autre choix est Aucun ;
- son contenu : Haut-parleur, Mode nuit, Malentendants ;
- opérations disponibles : épingler le widget et choisir sa position épinglée ;
- aucun ajout de widget personnel, application ou URL n'est proposé dans ce menu.

Le navigateur et notre app ne sont pas proposés dans cette liste. Une vignette
épinglée d'activité en cours n'établirait d'ailleurs pas un lancement après
reboot. Ne pas confondre ces widgets avec Freebox Home sur smartphone, Freebox
Server, le navigateur Révolution v6 ou les widgets d'une app de screensaver
obtenue sur le Store. La recherche des exemples/manifeste SDK n'a pas trouvé de
contrat public de widget d'accueil ; ce résultat reste borné au SDK examiné.

## Réutilisation des preuves REA et limite native

L'archive officielle de libfbxqml 2016 et son analyse REA sont réutilisées.
La rétention de la nouvelle session REA est vide pour l'ancien Evidence ID ;
le relevé a donc été relu depuis l'export local antérieur, sans refaire l'analyse.
Parent : ev_b0bddd40aac576a34bc2674f8267e9fc5fa578d6b679d5904ed14bd0f46bcf8c.
SHA-256 du répertoire : 957f415a3e39e4cbe07dcee28e80d013e1347d52eedf668a4425b7c3ce0d1c91.
Sa couverture QML/JS est partielle, avec 24 échecs de parsing sur 31 JS.

application.qml distribué est une fenêtre de simulation pour développement ;
il ne livre pas l'implémentation native du catalogue ou des favoris du Player.
L'énumération native précédente de App ne fournit pas de méthode établie d'ajout
au menu. L'absence de symbole dans ces preuves ne démontre pas l'absence de tout
protocole interne. Aucun appel système ou écriture de réglage deviné n'est tenté.

## Conclusion bornée

Le navigateur interne, les touches de navigation et l'ajout manuel de signets
fonctionnent sur ce Devialet sans abonnement. En revanche, un raccourci accessible
depuis l'accueil après reboot, sans PC ni autre matériel, n'est pas établi.
Les widgets observés ne fournissent pas ce point d'entrée. Un mécanisme natif
d'enregistrement ou une autre entrée déjà accessible resterait à démontrer ;
le signet interne seul ne satisfait pas la demande.

## Vérifications et état final

Le serveur de test est fermé : aucun listener sur le port 3017. Le lecteur
de la passerelle permanente répond HTTP 200, Freebox v7 reachable=true,
controlEnabled=false, observation âgée de 4,1 secondes. Aucun redémarrage du
Player ni changement de catalogue ou de service permanent n'a été réalisé.

Syntaxe de la sonde temporaire, liens locaux et git diff --check vérifiés.
La passe ne modifie que trois documents ; aucun test de production n'est
présenté comme relancé. Les preuves et le script restent dans .local pour
poursuivre cette recherche non intégrée. Le worktree feat/local-network est
conservé à cette fin. Le marqueur d'arrêt jetable est supprimé.
