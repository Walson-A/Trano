import {
  createApi,
  connectTranoWs as connectWs,
  type TranoWsHandlers,
} from '@trano/shared/api';
import { useHomeStore } from '../core/store/useHomeStore';

export type { TranoWsHandlers };
export type { BackupStatus } from '@trano/shared/api';

/**
 * Client API du serveur Trano.
 *
 * Le corps du client vit dans `@trano/shared/api`, partagé avec l'app native :
 * deux copies dériveraient, et une route renommée d'un seul côté ne se verrait
 * qu'au moment où quelqu'un tombe sur un écran vide.
 *
 * Ici on ne fait qu'une chose : dire **où** est le serveur. Le web est servi
 * par lui, donc chemins relatifs — en dev le proxy Vite redirige /api vers
 * localhost:3001, en prod le serveur sert l'app.
 */
export const api = createApi({ homeId: () => useHomeStore.getState().homeId });

export async function homeRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const homeId = useHomeStore.getState().homeId;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  let res: Response;
  try {
    res = await fetch(`${path}${path.includes('?') ? '&' : '?'}home_id=${encodeURIComponent(homeId)}`, {
      ...init, signal: controller.signal, headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    });
  } finally { clearTimeout(timer); }
  if (!res.ok) {
    const error = await res.json().catch(() => null);
    throw new Error(error?.error ?? 'Trano injoignable.');
  }
  return res.json();
}

/** Connexion WebSocket au serveur Trano avec reconnexion automatique. */
export function connectTranoWs(handlers: TranoWsHandlers): () => void {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return connectWs(`${proto}://${window.location.host}/api/ws`, handlers);
}
