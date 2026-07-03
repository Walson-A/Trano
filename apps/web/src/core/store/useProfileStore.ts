import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile, ProfileCreate, ProfileUpdate } from '@trano/shared';
import { api } from '../../lib/api';

interface ProfileState {
  profiles: Profile[];
  /** Profil actif sur CET écran (persisté par appareil, comme Netflix) */
  activeProfileId: string | null;
  loaded: boolean;
  error: string | null;

  fetchProfiles: () => Promise<void>;
  createProfile: (data: ProfileCreate) => Promise<Profile>;
  updateProfile: (id: string, data: ProfileUpdate) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  setActiveProfile: (id: string | null) => void;
  /** Épingle/désépingle un appareil dans les favoris du profil actif */
  toggleFavorite: (entityId: string) => Promise<void>;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profiles: [],
      activeProfileId: null,
      loaded: false,
      error: null,

      fetchProfiles: async () => {
        try {
          const profiles = await api.profiles.list();
          set({ profiles, loaded: true, error: null });
          // Si le profil actif a été supprimé depuis un autre écran
          const { activeProfileId } = get();
          if (activeProfileId && !profiles.some((p) => p.id === activeProfileId)) {
            set({ activeProfileId: null });
          }
        } catch (err) {
          set({ loaded: true, error: err instanceof Error ? err.message : 'Serveur injoignable' });
        }
      },

      createProfile: async (data) => {
        const profile = await api.profiles.create(data);
        set((state) => ({ profiles: [...state.profiles, profile] }));
        return profile;
      },

      updateProfile: async (id, data) => {
        const updated = await api.profiles.update(id, data);
        set((state) => ({
          profiles: state.profiles.map((p) => (p.id === id ? updated : p)),
        }));
      },

      deleteProfile: async (id) => {
        await api.profiles.remove(id);
        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== id),
          activeProfileId: state.activeProfileId === id ? null : state.activeProfileId,
        }));
      },

      setActiveProfile: (id) => set({ activeProfileId: id }),

      toggleFavorite: async (entityId) => {
        const { activeProfileId, profiles, updateProfile } = get();
        const profile = profiles.find((p) => p.id === activeProfileId);
        if (!profile) return;
        const favorites = profile.favorites.includes(entityId)
          ? profile.favorites.filter((f) => f !== entityId)
          : [...profile.favorites, entityId];
        await updateProfile(profile.id, { favorites });
      },
    }),
    {
      name: 'trano-active-profile',
      partialize: (state) => ({ activeProfileId: state.activeProfileId }),
    }
  )
);

export function useActiveProfile(): Profile | null {
  const profiles = useProfileStore((s) => s.profiles);
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  return profiles.find((p) => p.id === activeProfileId) ?? null;
}
