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
  /** Épingle/désépingle une pièce dans les favoris du profil actif */
  toggleMyRoom: (roomId: string) => Promise<void>;
  /** Patch optimiste d'un profil : applique, écrit, et revient en arrière si le serveur refuse. */
  applyProfilePatch: (id: string, patch: ProfileUpdate) => Promise<void>;
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

      /**
       * Bascule optimiste, puis écriture serveur.
       *
       * Avant : l'écriture partait sans filet. Si le serveur ne répondait pas —
       * conteneur qui redémarre, wifi de la tablette qui cligne — la promesse
       * était rejetée dans le vide et le cœur ne bougeait tout simplement pas.
       * Vu de l'utilisateur, le favori « ne tenait pas ». Désormais la carte
       * réagit tout de suite, et un échec **revient en arrière** avec un
       * message : un favori perdu se voit, au lieu de se deviner.
       */
      toggleFavorite: async (entityId) => {
        const { activeProfileId, profiles } = get();
        const profile = profiles.find((p) => p.id === activeProfileId);
        if (!profile) {
          set({ error: 'Aucun profil actif : impossible d’épingler un favori.' });
          return;
        }
        const favorites = profile.favorites.includes(entityId)
          ? profile.favorites.filter((f) => f !== entityId)
          : [...profile.favorites, entityId];
        await get().applyProfilePatch(profile.id, { favorites });
      },

      toggleMyRoom: async (roomId) => {
        const { activeProfileId, profiles } = get();
        const profile = profiles.find((p) => p.id === activeProfileId);
        if (!profile) {
          set({ error: 'Aucun profil actif : impossible d’épingler une pièce.' });
          return;
        }
        // L'étoile ne pose plus un « favori » distinct : elle dit « c'est ma
        // pièce ». Il y avait deux mécanismes pour une seule intention — les
        // pièces attitrées et les pièces épinglées — et personne n'en
        // remplissait aucun. Il n'en reste qu'un.
        const roomIds = profile.roomIds.includes(roomId)
          ? profile.roomIds.filter((r) => r !== roomId)
          : [...profile.roomIds, roomId];
        await get().applyProfilePatch(profile.id, { roomIds });
      },

      applyProfilePatch: async (id, patch) => {
        const before = get().profiles;
        set({
          error: null,
          profiles: before.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        });
        try {
          const updated = await api.profiles.update(id, patch);
          set((state) => ({ profiles: state.profiles.map((p) => (p.id === id ? updated : p)) }));
        } catch (err) {
          set({
            profiles: before, // on ne garde pas à l'écran ce que le serveur n'a pas pris
            error: err instanceof Error ? err.message : 'Serveur injoignable — modification annulée',
          });
        }
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
