import { create } from 'zustand';
import type { Room, RoomCreate, RoomUpdate } from '@trano/shared';
import { api } from '../../lib/api';

/**
 * Pièces de la maison — source de vérité : le serveur Trano (personnalisables
 * depuis les Réglages, synchronisées entre tous les écrans).
 */
interface RoomsState {
  rooms: Room[];
  loaded: boolean;

  fetchRooms: () => Promise<void>;
  createRoom: (data: RoomCreate) => Promise<void>;
  updateRoom: (id: string, data: RoomUpdate) => Promise<void>;
  deleteRoom: (id: string) => Promise<void>;
}

export const useRoomsStore = create<RoomsState>((set) => ({
  rooms: [],
  loaded: false,

  fetchRooms: async () => {
    try {
      const rooms = await api.rooms.list();
      set({ rooms, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  createRoom: async (data) => {
    const room = await api.rooms.create(data);
    set((s) => ({ rooms: [...s.rooms, room] }));
  },

  updateRoom: async (id, data) => {
    const updated = await api.rooms.update(id, data);
    set((s) => ({ rooms: s.rooms.map((r) => (r.id === id ? updated : r)) }));
  },

  deleteRoom: async (id) => {
    await api.rooms.remove(id);
    set((s) => ({ rooms: s.rooms.filter((r) => r.id !== id) }));
  },
}));

export function useRoom(id: string | null | undefined): Room | undefined {
  const rooms = useRoomsStore((s) => s.rooms);
  return id ? rooms.find((r) => r.id === id) : undefined;
}
