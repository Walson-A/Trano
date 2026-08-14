import { create } from 'zustand';
import type { HouseState } from '@trano/shared/api';
import { getApi } from '@/lib/server';
import { useProfiles } from '@/features/profiles/store';

/**
 * L'état de la maison, relu périodiquement.
 *
 * Pourquoi un minuteur et pas le fil temps réel : le WebSocket de Trano diffuse
 * ses **propres** changements (profils, courses, présence), pas ceux de Home
 * Assistant. Une lampe allumée depuis un interrupteur mural n'émet rien de ce
 * côté — seule une relecture la voit.
 */

const PERIOD_MS = 10_000;

interface HouseStore {
  state: HouseState | null;
  error: string | null;
  refresh: () => Promise<void>;
  /** Bascule un appareil, puis relit : HA est la vérité, pas nous. */
  toggle: (entityId: string) => Promise<void>;
}

export const useHouse = create<HouseStore>((set, get) => ({
  state: null,
  error: null,

  refresh: async () => {
    try {
      const profileId = useProfiles.getState().ownerId;
      set({ state: await getApi().house.state(profileId), error: null });
    } catch (e) {
      // On garde l'état précédent : afficher « 0 W » parce que le serveur n'a
      // pas répondu ferait croire à une panne de production.
      set({ error: e instanceof Error ? e.message : 'Maison injoignable' });
    }
  },

  toggle: async (entityId) => {
    try {
      const res = await getApi().house.control(entityId);
      // Le serveur refuse certains domaines (serrures, alarme) avec un message
      // explicite plutôt qu'une erreur : on le montre tel quel.
      if (!res.ok) set({ error: res.message });
      await get().refresh();
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Commande impossible' });
    }
  },
}));

export const HOUSE_PERIOD_MS = PERIOD_MS;
