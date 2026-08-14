import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createApi, type TranoApi } from '@trano/shared/api';

/**
 * Où est le serveur de la maison.
 *
 * C'est la seule chose que l'app native doit savoir et que le web ignore : le
 * web *est* servi par le serveur, une app posée sur un téléphone doit le
 * désigner. Rien ne fonctionne tant que cette adresse est fausse, d'où un
 * réglage visible plutôt qu'une constante enfouie.
 *
 * ⚠️ Hors du réseau de la maison, cette adresse ne répond pas. C'est le point
 * dur restant : le géofence doit signaler un départ **au moment précis** où le
 * Wi-Fi vient d'être perdu. Deux issues, à trancher au chantier géofence —
 * Tailscale sur les téléphones, ou une file d'envoi rejouée à la reconnexion.
 */

const KEY = 'trano-server-url';

/**
 * L'adresse de départ, dans l'ordre où elle est cherchée :
 *
 * 1. celle que quelqu'un a saisie dans Réglages, gardée sur l'appareil ;
 * 2. `EXPO_PUBLIC_TRANO_SERVER_URL`, pour pointer une autre machine sans
 *    toucher au code — un serveur local pendant qu'on développe, par exemple ;
 * 3. le serveur de la maison, en dernier recours.
 *
 * ⚠️ Deux choses à savoir sur le `.env`.
 *
 * Il est **lu à la fabrication du paquet, pas au lancement** : Expo remplace
 * littéralement `process.env.EXPO_PUBLIC_…` par sa valeur pendant la
 * compilation. Il faut donc écrire l'expression en toutes lettres — un accès
 * calculé ne serait jamais remplacé — et la valeur se retrouve **en clair dans
 * le paquet**. Rien de grave ici, l'adresse d'une machine sur le réseau de la
 * maison n'est pas un secret ; mais aucune clé n'a rien à faire dans un
 * `EXPO_PUBLIC_`.
 *
 * Et il n'est **pas versionné** (`.env*` est ignoré à la racine du dépôt), donc
 * les machines de construction d'EAS ne le voient pas : une construction dans
 * le nuage retombe sur la valeur ci-dessous. C'est voulu — c'est la bonne
 * adresse — mais si elle change un jour, il faut corriger *cette ligne*, pas
 * seulement son `.env`.
 */
export const DEFAULT_SERVER_URL =
  process.env.EXPO_PUBLIC_TRANO_SERVER_URL?.trim() || 'http://192.168.1.65:3001';

/** Tolère « 192.168.1.65:3001 », « http://…/ », les espaces d'un copier-coller. */
export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

/** `http://x:3001` → `ws://x:3001/api/ws`. */
export function wsUrlFor(baseUrl: string): string {
  return `${baseUrl.replace(/^http/i, 'ws')}/api/ws`;
}

interface ServerState {
  url: string;
  /** Faux tant que le stockage n'a pas été relu : ne rien afficher avant. */
  ready: boolean;
  api: TranoApi;
  load: () => Promise<void>;
  setUrl: (raw: string) => Promise<void>;
}

export const useServer = create<ServerState>((set) => ({
  url: DEFAULT_SERVER_URL,
  ready: false,
  api: createApi({ baseUrl: DEFAULT_SERVER_URL }),

  load: async () => {
    try {
      const saved = await AsyncStorage.getItem(KEY);
      const url = saved ? normalizeUrl(saved) : DEFAULT_SERVER_URL;
      set({ url, api: createApi({ baseUrl: url }), ready: true });
    } catch {
      // Stockage illisible : l'adresse par défaut vaut mieux qu'un écran mort.
      set({ ready: true });
    }
  },

  setUrl: async (raw) => {
    const url = normalizeUrl(raw) || DEFAULT_SERVER_URL;
    set({ url, api: createApi({ baseUrl: url }) });
    try {
      await AsyncStorage.setItem(KEY, url);
    } catch {
      // Non persisté : l'adresse tiendra jusqu'à la fermeture de l'app.
    }
  },
}));

/** Raccourci hors composant (heartbeat, tâches de fond). */
export const getApi = (): TranoApi => useServer.getState().api;
