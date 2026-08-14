import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { Profile, ProfileCreate } from '@trano/shared';
import { getApi } from '@/lib/server';

/**
 * Les profils de la maison.
 *
 * Une différence de fond avec le web : il n'y a **pas de sélecteur de profil**
 * sur téléphone. Un téléphone appartient à quelqu'un, et il l'a dit une fois
 * pour toutes à sa première ouverture — redemander « qui es-tu ? » à chaque
 * lancement n'aurait aucun sens. Le web, lui, tourne sur des écrans partagés
 * où la question se pose vraiment.
 */

const OWNER_KEY = 'trano-profile-id';

interface ProfilesState {
  profiles: Profile[];
  loaded: boolean;
  /** Le propriétaire de cet appareil, choisi à la première connexion. */
  ownerId: string | null;
  fetch: () => Promise<void>;
  createProfile: (data: ProfileCreate) => Promise<Profile>;
  loadOwner: () => Promise<void>;
  setOwner: (id: string) => Promise<void>;
}

export const useProfiles = create<ProfilesState>((set) => ({
  profiles: [],
  loaded: false,
  ownerId: null,

  fetch: async () => {
    try {
      set({ profiles: await getApi().profiles.list(), loaded: true });
    } catch {
      // Serveur injoignable : on garde la liste précédente. `loaded` reste
      // faux au premier échec, pour que l'écran sache qu'il n'a rien.
    }
  },

  createProfile: async (data) => {
    const profile = await getApi().profiles.create(data);
    set((s) => ({ profiles: [...s.profiles, profile] }));
    return profile;
  },

  loadOwner: async () => {
    try {
      set({ ownerId: await AsyncStorage.getItem(OWNER_KEY) });
    } catch {
      // Sans stockage, l'appareil reste sans propriétaire connu localement :
      // le serveur, lui, sait toujours à qui il appartient.
    }
  },

  setOwner: async (id) => {
    set({ ownerId: id });
    try {
      await AsyncStorage.setItem(OWNER_KEY, id);
    } catch {
      // idem
    }
  },
}));

/** Palette partagée avec le web (`ProfileEditor.tsx`) — mêmes gens, mêmes couleurs. */
export const AVATARS = [
  '😀', '😎', '🥰', '🤗', '😜', '🧐', '🥳', '😴',
  '🦁', '🐼', '🦊', '🐸', '🦄', '🐙', '🦖', '🐣',
  '👑', '🚀', '🎮', '🎸', '⚽', '🌸', '🌙', '⭐',
];

export const COLORS = [
  '#f59e0b', '#ef4444', '#ec4899', '#a855f7',
  '#6366f1', '#0ea5e9', '#10b981', '#84cc16',
];
