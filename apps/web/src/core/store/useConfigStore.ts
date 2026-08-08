import { create } from 'zustand';
import type { DeviceOverride } from '@trano/shared';
import { api } from '../../lib/api';

// ─── Store Types ────────────────────────────────────────────

interface ConfigState {
  // Device overrides keyed by entity_id
  deviceOverrides: Record<string, DeviceOverride>;
  loaded: boolean;

  // Actions
  fetchOverrides: () => Promise<void>;
  setDeviceOverride: (entityId: string, override: Partial<DeviceOverride>) => void;
  removeDeviceOverride: (entityId: string) => void;
  setDeviceName: (entityId: string, name: string) => void;
  setDeviceRoom: (entityId: string, roomId: string) => void;
  setDeviceHidden: (entityId: string, hidden: boolean) => void;
  setDevicePosition: (entityId: string, position: { x: number; y: number }) => void;
  resetAllOverrides: () => void;
}

// ─── Store ──────────────────────────────────────────────────

/**
 * Surcharges d'appareils, synchronisées sur tous les écrans.
 *
 * Avant ce correctif, les overrides vivaient dans l'IndexedDB locale de
 * chaque navigateur : renommer un appareil sur la tablette du salon ne
 * se reflétait pas sur le téléphone. Désormais la source de vérité est
 * le serveur Trano (table device_overrides dans SQLite) et les clients
 * se tiennent à jour via le WebSocket d'invalidation.
 */
export const useConfigStore = create<ConfigState>()((set, get) => ({
  deviceOverrides: {},
  loaded: false,

  fetchOverrides: async () => {
    try {
      const overrides = await api.overrides.list();
      set({ deviceOverrides: overrides, loaded: true });
    } catch {
      // Serveur injoignable au démarrage : on retente via le WS
      set({ loaded: true });
    }
  },

  setDeviceOverride: (entityId, override) => {
    // Mise à jour optimiste
    set((state) => ({
      deviceOverrides: {
        ...state.deviceOverrides,
        [entityId]: { ...state.deviceOverrides[entityId], ...override },
      },
    }));
    api.overrides.set(entityId, override).catch(() => {
      // Rollback en cas d'échec : refetch depuis le serveur
      get().fetchOverrides();
    });
  },

  removeDeviceOverride: (entityId) => {
    set((state) => {
      const { [entityId]: _, ...rest } = state.deviceOverrides;
      return { deviceOverrides: rest };
    });
    api.overrides.remove(entityId).catch(() => {
      get().fetchOverrides();
    });
  },

  setDeviceName: (entityId, name) => {
    get().setDeviceOverride(entityId, { displayName: name });
  },

  setDeviceRoom: (entityId, roomId) => {
    get().setDeviceOverride(entityId, { roomId });
  },

  setDeviceHidden: (entityId, hidden) => {
    get().setDeviceOverride(entityId, { hidden });
  },

  setDevicePosition: (entityId, position) => {
    get().setDeviceOverride(entityId, { position });
  },

  resetAllOverrides: () => set({ deviceOverrides: {} }),
}));
