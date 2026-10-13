# Revue du multi-logement

13 octobre 2026. Vrais composants Trano et Atlas dans un banc avec fixtures
identifiées par le profil « Walson · banc » et la page Atlas « BANC ISOLÉ ».
Les captures ne sont pas des états d’appareils réellement commandés.

Le contrat retenu est un HA familial commun et des appareils affectés aux
logements. Walson confirme le déplacement de LED Télé à l’appartement ; le serveur
réel la voit déjà via Tuya cloud. Cette inspection est distincte de la revue UI.

## Composition et parcours

- Grand écran 1365 × 900 : logement permanent dans la barre, titre qui le confirme,
  navigation latérale et grille de commandes. La carte hors ligne est plus courte
  et son bouton désactivé ; aucun faux état de connexion.
- Écran étroit 390 × 844 : commandes larges, intitulés lisibles et navigation
  inférieure. Pas de débordement horizontal constaté.
- Affectation HA : choix d’appareils, effet annoncé sur la maison familiale,
  validation explicite. Les appareils du HA partagé restent séparés côté serveur.
- Courses : choix d’envoi distinct de l’achat, destinataire visible, nombre
  d’articles et confirmation que la liste source reste intacte.
- Widget 360 × 300 : sélecteur lisible, favoris dans la surface existante,
  changement de logement testé. Un ancien serveur qui ne confirme pas le logement
  est refusé et aucune lampe de main n’est présentée comme celle de l’appart.

La première capture de développement montrait la navigation mobile sur grand
écran : ses styles responsive manquaient dans ce banc. La recapture sur le bundle
de production retrouve la sidebar et la grille ; le test vérifie ce point. La revue
finale porte sur le CSS livré, pas sur une supposition fondée sur les classes.

## Preuves

- [Choix des appareils du HA commun](trano-shared-ha-assignment.png).
- [Appartement via HA commun](trano-shared-ha-apartment.png).
- [Sélection des courses](trano-shopping-selection.png), [confirmation](trano-shopping-sent.png).
- [Widget](atlas-widget-apartment-detail.png), [refus de l’ancien serveur](atlas-widget-legacy-refused.png).
- [Grande vue embarquée dans Atlas](atlas-focus-apartment.png), changement de
  logement de l’iframe vers le widget vérifié.
- [Écran étroit](trano-apartment-narrow.png).

## Vérifications et limites

Six tests serveur passent : logements sans secrets, courses isolées/envoi atomique,
contextes HA concurrents, filtrage Tuya et commandes, formats inconnus/hors ligne,
affectation dans un HA partagé et refus des commandes croisées.
L’affectation vérifie aussi la reprise d’un favori existant et le respect de son
retrait ultérieur, même si la sélection d’appareils est réenregistrée.
Le contrôle TypeScript serveur et web et le bundle ont été vérifiés. Les contrats du banc
navigateur sont exécutables dans `apps/web/tests/multi-home-browser.mjs`.

Le focus/clavier et la région native Windows demandent une réception WebView2.
Le compte Tuya direct, facultatif, n’a pas été activé ; le HA commun est la voie
retenue. Un état lu en HA ne prouve pas une commande matérielle : les vérifications
après déploiement sont consignées séparément ci-dessous.

La [vérification de livraison](deployment.md) confirme désormais la version
installée, l’affectation réelle, les favoris et les commandes après déploiement.
