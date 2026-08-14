import { useEffect } from 'react';
import { connectTranoWs } from '@trano/shared/api';
import { useServer, wsUrlFor } from '@/lib/server';
import { usePresence } from '@/features/presence/store';

/**
 * Le fil temps réel avec la maison, ouvert une seule fois à la racine.
 *
 * C'est lui qui rend une arrivée ou un départ instantané : le serveur diffuse
 * `presence` au moment exact du franchissement. Le rappel périodique des écrans
 * reste nécessaire à côté — la présence se dégrade **par le silence**, et un
 * téléphone qui s'éteint n'émet rien.
 */
export function useTranoWs(): void {
  const url = useServer((s) => s.url);

  useEffect(() => {
    const refreshPresence = () => void usePresence.getState().refresh();

    return connectTranoWs(wsUrlFor(url), {
      onChanged: (topic) => {
        if (topic === 'presence' || topic === 'user-devices') refreshPresence();
      },
      // Après une coupure, les événements manqués ne reviendront pas : on
      // relit tout plutôt que d'afficher un état figé au moment de la panne.
      onReconnect: refreshPresence,
    });
  }, [url]);
}
