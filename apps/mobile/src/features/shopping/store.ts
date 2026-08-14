import { create } from 'zustand';
import type { ShoppingItem, ShoppingItemCreate } from '@trano/shared';
import { getApi } from '@/lib/server';

/**
 * La liste de courses, partagée par toute la maison.
 *
 * Le serveur est la seule source : pas de miroir local. Deux personnes dans le
 * même magasin doivent voir la même liste, et une case cochée sur le téléphone
 * doit disparaître de la tablette de la cuisine — c'est le fil temps réel qui
 * s'en charge (`lib/ws.ts`).
 *
 * Les mises à jour sont **optimistes** : cocher un article doit être instantané
 * dans une allée de supermarché, pas attendre un aller-retour réseau. En cas
 * d'échec on relit le serveur, qui a toujours raison.
 */

interface ShoppingState {
  items: ShoppingItem[];
  loaded: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  add: (data: ShoppingItemCreate) => Promise<void>;
  toggle: (item: ShoppingItem, byProfileId: string | null) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useShopping = create<ShoppingState>((set, get) => ({
  items: [],
  loaded: false,
  error: null,

  refresh: async () => {
    try {
      set({ items: await getApi().shopping.list(), loaded: true, error: null });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Liste indisponible' });
    }
  },

  add: async (data) => {
    try {
      const item = await getApi().shopping.create(data);
      set((s) => ({ items: [item, ...s.items], error: null }));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : "Impossible d'ajouter" });
    }
  },

  toggle: async (item, byProfileId) => {
    const next = item.status === 'todo' ? 'bought' : 'todo';
    // Optimiste : l'article bascule tout de suite.
    set((s) => ({
      items: s.items.map((i) => (i.id === item.id ? { ...i, status: next } : i)),
    }));
    try {
      const saved = await getApi().shopping.update(item.id, {
        status: next,
        boughtBy: next === 'bought' ? byProfileId : null,
      });
      // Le serveur décide vraiment : c'est lui qui gère la récurrence, et un
      // article récurrent coché peut revenir avec une date de réapparition.
      set((s) => ({ items: s.items.map((i) => (i.id === saved.id ? saved : i)) }));
    } catch {
      await get().refresh();
    }
  },

  remove: async (id) => {
    const avant = get().items;
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
    try {
      await getApi().shopping.remove(id);
    } catch {
      set({ items: avant, error: 'Suppression impossible' });
    }
  },
}));
