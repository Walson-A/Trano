import { create } from 'zustand';
import type { ShoppingItem, ShoppingItemCreate, ShoppingItemUpdate } from '@trano/shared';
import { api } from '../../lib/api';
import { useHomeStore } from './useHomeStore';

interface ShoppingState {
  items: ShoppingItem[];
  loaded: boolean;
  error: string | null;

  fetchItems: () => Promise<void>;
  addItem: (data: ShoppingItemCreate) => Promise<void>;
  updateItem: (id: string, data: ShoppingItemUpdate) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  /** Cocher/décocher avec mise à jour optimiste (réactivité au doigt) */
  toggleBought: (id: string, boughtBy: string | null) => Promise<void>;
}

export const useShoppingStore = create<ShoppingState>((set, get) => ({
  items: [],
  loaded: false,
  error: null,

  fetchItems: async () => {
    const homeId = useHomeStore.getState().homeId;
    try {
      const items = await api.shopping.list();
      if (homeId !== useHomeStore.getState().homeId) return;
      set({ items, loaded: true, error: null });
    } catch (err) {
      if (homeId !== useHomeStore.getState().homeId) return;
      set({ loaded: true, error: err instanceof Error ? err.message : 'Serveur injoignable' });
    }
  },

  addItem: async (data) => {
    const homeId = useHomeStore.getState().homeId;
    const item = await api.shopping.create(data);
    if (homeId !== useHomeStore.getState().homeId) return;
    set((state) => ({ items: [item, ...state.items] }));
  },

  updateItem: async (id, data) => {
    const homeId = useHomeStore.getState().homeId;
    const updated = await api.shopping.update(id, data);
    if (homeId !== useHomeStore.getState().homeId) return;
    set((state) => ({ items: state.items.map((i) => (i.id === id ? updated : i)) }));
  },

  removeItem: async (id) => {
    const homeId = useHomeStore.getState().homeId;
    await api.shopping.remove(id);
    if (homeId !== useHomeStore.getState().homeId) return;
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
  },

  toggleBought: async (id, boughtBy) => {
    const homeId = useHomeStore.getState().homeId;
    const item = get().items.find((i) => i.id === id);
    if (!item) return;
    const nextStatus = item.status === 'todo' ? 'bought' : 'todo';

    // Optimiste : l'UI répond immédiatement, le serveur confirme via WS
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, status: nextStatus } : i)),
    }));
    try {
      const updated = await api.shopping.update(id, { status: nextStatus, boughtBy });
      if (homeId !== useHomeStore.getState().homeId) return;
      set((state) => ({ items: state.items.map((i) => (i.id === id ? updated : i)) }));
    } catch {
      if (homeId !== useHomeStore.getState().homeId) return;
      // Échec serveur : on remet l'état précédent
      set((state) => ({
        items: state.items.map((i) => (i.id === id ? item : i)),
      }));
    }
  },
}));
