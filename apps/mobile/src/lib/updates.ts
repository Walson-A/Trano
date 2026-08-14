import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Updates from 'expo-updates';

/**
 * Mises à jour par les airs (OTA).
 *
 * Ce que ça change concrètement : corriger un libellé ou un écran ne demande
 * plus de reconstruire l'app, de la resigner, ni de faire réinstaller quoi que
 * ce soit à cinq personnes. `eas update` publie, les téléphones ramassent.
 *
 * ⚠️ **Seul le JavaScript voyage.** Ajouter un module natif — une permission,
 * `expo-location`, un son — exige une nouvelle construction et une nouvelle
 * installation. C'est précisément pourquoi les modules dont le chantier a
 * besoin (position, tâches de fond, notifications, batterie, réseau) sont
 * installés **dès maintenant** : ils coûtent une construction aujourd'hui, et
 * plus aucune ensuite.
 *
 * La version d'exécution suit la politique `fingerprint` : Expo calcule une
 * empreinte de tout le code natif. Dès qu'elle change, les anciens binaires
 * cessent de recevoir les mises à jour destinées aux nouveaux — un téléphone
 * ne peut donc jamais charger un JavaScript qui réclame un module natif qu'il
 * n'a pas.
 */

/**
 * Cherche une mise à jour au démarrage et à chaque retour au premier plan, et
 * l'applique aussitôt téléchargée.
 *
 * Le rechargement se fait **au moment où l'on revient sur l'app**, pas en cours
 * d'usage : personne ne se fait couper au milieu d'un geste. Et pas seulement
 * au lancement — une app qu'on ne tue jamais (le cas normal sur iPhone) ne se
 * « lance » quasiment plus, et resterait sinon sur une vieille version des
 * semaines durant.
 */
export function useAutoUpdates(): void {
  const busy = useRef(false);

  useEffect(() => {
    // Rien à faire en développement ni dans Expo Go : le code vient du Metro
    // local, pas du serveur de mises à jour.
    if (__DEV__ || !Updates.isEnabled) return;

    const checkAndApply = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable) return;
        const fetched = await Updates.fetchUpdateAsync();
        if (fetched.isNew) await Updates.reloadAsync();
      } catch {
        // Serveur de mises à jour injoignable — le cas courant : on est chez
        // soi sans Internet, ou en 4G capricieuse. L'app tourne très bien sur
        // la version qu'elle a déjà ; on retentera au prochain réveil.
      } finally {
        busy.current = false;
      }
    };

    void checkAndApply();

    const onChange = (state: AppStateStatus) => {
      if (state === 'active') void checkAndApply();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);
}

/** De quoi afficher, dans les réglages, ce qui tourne exactement. */
export function runningVersion(): {
  channel: string;
  runtimeVersion: string;
  updateId: string;
  /** Vrai si c'est le JavaScript livré dans le binaire, sans OTA appliquée. */
  embedded: boolean;
} {
  return {
    channel: Updates.channel ?? 'développement',
    runtimeVersion: Updates.runtimeVersion ?? '—',
    updateId: Updates.updateId ?? '—',
    embedded: Updates.isEmbeddedLaunch,
  };
}
