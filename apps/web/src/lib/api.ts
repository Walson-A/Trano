import {
  createApi,
  connectTranoWs as connectWs,
  type TranoWsHandlers,
} from '@trano/shared/api';

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
export const api = createApi();

/** Connexion WebSocket au serveur Trano avec reconnexion automatique. */
export function connectTranoWs(handlers: TranoWsHandlers): () => void {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return connectWs(`${proto}://${window.location.host}/api/ws`, handlers);
}
