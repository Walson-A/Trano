import { create } from 'zustand';

export interface TranoHome { id: string; name: string; provider: 'ha' | 'tuya'; configured: boolean; sharedHA?: boolean; entityIds?: string[]; excludedEntityIds?: string[] }
const requested = new URLSearchParams(location.search).get('home');
const stored = localStorage.getItem('trano-home');
export const useHomeStore = create<{
  homeId: string; homes: TranoHome[]; error: string | null;
  select: (id: string) => void; fetchHomes: () => Promise<void>;
}>((set, get) => ({
  homeId: requested || stored || 'main', homes: [], error: null,
  select: id => {
    if (!get().homes.some(home => home.id === id)) return;
    localStorage.setItem('trano-home', id);
    const url = new URL(location.href);
    url.searchParams.set('home', id);
    history.replaceState(null, '', url);
    set({ homeId: id });
    // The parent validates source + origin. This message contains no credential.
    window.parent.postMessage({ type: 'trano:home-selected', homeId: id }, '*');
  },
  fetchHomes: async () => {
    try {
      const res = await fetch('/api/homes');
      if (!res.ok) throw new Error('Impossible de charger les logements.');
      const homes = await res.json() as TranoHome[];
      set({ homes });
      // Keep an unknown selection visible as an error; never silently command main.
      if (!homes.some(home => home.id === get().homeId)) throw new Error('Ce logement n’existe plus. Choisir un logement.');
      set({ homes, error: null });
    } catch (error) { set({ error: error instanceof Error ? error.message : 'Trano injoignable.' }); }
  },
}));
