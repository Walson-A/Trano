import type { FastifyInstance } from 'fastify';
import type { WsIntercomMessage } from '@trano/shared';
import { broadcastMessage } from '../ws.ts';

/**
 * Interphone maison : relaie un message vers tous les écrans Trano ouverts
 * (tablette murale, PC, PWA…). La sonnerie des téléphones via l'app
 * compagnon HA est envoyée directement par le client émetteur (connexion
 * HA déjà ouverte dans le navigateur).
 */
export function intercomRoutes(app: FastifyInstance): void {
  app.post<{
    Body: { from: WsIntercomMessage['from']; toProfileId: string | null; message: string };
  }>('/api/intercom', (req, reply) => {
    const { from, toProfileId = null, message } = req.body ?? {};
    if (!from?.name || !message?.trim()) {
      return reply.code(400).send({ error: 'Expéditeur et message requis' });
    }
    broadcastMessage({
      type: 'intercom',
      from: { name: from.name, avatar: from.avatar ?? '📢', color: from.color ?? '#f59e0b' },
      toProfileId,
      message: message.trim().slice(0, 200),
    });
    return reply.code(204).send();
  });
}
