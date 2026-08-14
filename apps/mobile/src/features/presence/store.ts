import { create } from 'zustand';
import type { PresenceEntry } from '@trano/shared';
import { getApi } from '@/lib/server';

interface PresenceState {
  people: PresenceEntry[] | null;
  error: string | null;
  refresh: () => Promise<void>;
}

export const usePresence = create<PresenceState>((set) => ({
  people: null,
  error: null,
  refresh: async () => {
    try {
      set({ people: await getApi().presence.list(), error: null });
    } catch (e) {
      // On garde la liste précédente : la faire disparaître se lirait comme
      // « personne n'est là », ce qui est faux — on ne sait juste plus.
      set({ error: e instanceof Error ? e.message : 'Serveur injoignable' });
    }
  },
}));
