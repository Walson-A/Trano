import type { WsMessage, WsTopic } from '@trano/shared';
import type { WebSocket } from '@fastify/websocket';

/**
 * Sync temps réel minimaliste : le serveur ne pousse que des messages
 * d'invalidation ({type:'changed', topic}) et les clients refetchent.
 * Simple, robuste, aucun risque de désynchronisation d'état.
 */
const clients = new Set<WebSocket>();

export function registerClient(socket: WebSocket): void {
  clients.add(socket);
  socket.on('close', () => clients.delete(socket));
  socket.on('error', () => clients.delete(socket));
}

export function broadcast(topic: WsTopic): void {
  broadcastMessage({ type: 'changed', topic });
}

export function broadcastMessage(msg: WsMessage): void {
  const payload = JSON.stringify(msg);
  for (const socket of clients) {
    if (socket.readyState === socket.OPEN) socket.send(payload);
  }
}
