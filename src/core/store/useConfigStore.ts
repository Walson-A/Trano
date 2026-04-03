import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DeviceOverride } from '../../types';

/**
 * IndexedDB-backed storage adapter for Zustand persist.
 * Falls back to localStorage if IndexedDB is unavailable.
 */
function createIDBStorage() {
  const DB_NAME = 'trano-config';
  const STORE_NAME = 'keyval';

  function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE_NAME);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  return createJSONStorage<ConfigState>(() => ({
    async getItem(key: string): Promise<string | null> {
      try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const req = tx.objectStore(STORE_NAME).get(key);
          req.onsuccess = () => resolve(req.result ?? null);
          req.onerror = () => reject(req.error);
        });
      } catch {
        return localStorage.getItem(key);
      }
    },
    async setItem(key: string, value: string): Promise<void> {
      try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).put(value, key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch {
        localStorage.setItem(key, value);
      }
    },
    async removeItem(key: string): Promise<void> {
      try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).delete(key);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      } catch {
        localStorage.removeItem(key);
      }
    },
  }));
}

// ─── Store Types ────────────────────────────────────────────

interface ConfigState {
  // Device overrides keyed by entity_id
  deviceOverrides: Record<string, DeviceOverride>;

  // Actions
  setDeviceOverride: (entityId: string, override: Partial<DeviceOverride>) => void;
  removeDeviceOverride: (entityId: string) => void;
  setDeviceName: (entityId: string, name: string) => void;
  setDeviceRoom: (entityId: string, roomId: string) => void;
  setDeviceHidden: (entityId: string, hidden: boolean) => void;
  setDevicePosition: (entityId: string, position: { x: number; y: number }) => void;
  resetAllOverrides: () => void;
}

// ─── Store ──────────────────────────────────────────────────

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      deviceOverrides: {},

      setDeviceOverride: (entityId, override) =>
        set((state) => ({
          deviceOverrides: {
            ...state.deviceOverrides,
            [entityId]: { ...state.deviceOverrides[entityId], ...override },
          },
        })),

      removeDeviceOverride: (entityId) =>
        set((state) => {
          const { [entityId]: _, ...rest } = state.deviceOverrides;
          return { deviceOverrides: rest };
        }),

      setDeviceName: (entityId, name) =>
        set((state) => ({
          deviceOverrides: {
            ...state.deviceOverrides,
            [entityId]: { ...state.deviceOverrides[entityId], displayName: name },
          },
        })),

      setDeviceRoom: (entityId, roomId) =>
        set((state) => ({
          deviceOverrides: {
            ...state.deviceOverrides,
            [entityId]: { ...state.deviceOverrides[entityId], roomId },
          },
        })),

      setDeviceHidden: (entityId, hidden) =>
        set((state) => ({
          deviceOverrides: {
            ...state.deviceOverrides,
            [entityId]: { ...state.deviceOverrides[entityId], hidden },
          },
        })),

      setDevicePosition: (entityId, position) =>
        set((state) => ({
          deviceOverrides: {
            ...state.deviceOverrides,
            [entityId]: { ...state.deviceOverrides[entityId], position },
          },
        })),

      resetAllOverrides: () => set({ deviceOverrides: {} }),
    }),
    {
      name: 'trano-config',
      storage: createIDBStorage(),
    }
  )
);
