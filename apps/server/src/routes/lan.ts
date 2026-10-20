import type { FastifyInstance } from 'fastify';
import { listLocalDevices, controlLocalMedia } from '../lib/lan.ts';
import { tokenMatches } from '../../../../packages/lan/src/server.ts';
import { LanError } from '../../../../packages/lan/src/types.ts';

/** Same authentication boundary as MCP: never expose apartment control to the residence LAN. */
export function lanRoutes(app: FastifyInstance): void {
  app.register(async (routes) => {
    routes.addHook('preHandler', async (req, reply) => {
      const expected = process.env.TRANO_MCP_TOKEN?.trim();
      if (!expected) return reply.code(503).send({ error: 'API locale désactivée : TRANO_MCP_TOKEN absent.' });
      if (!tokenMatches(req.headers.authorization, expected)) return reply.code(401).send({ error: 'Jeton invalide.' });
    });
    routes.setErrorHandler((error, _req, reply) => {
      const status = error instanceof LanError ? error.status : error && typeof error === 'object' && 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 500;
      reply.code(status).send({
        error: error instanceof LanError ? error.message : 'Requête locale invalide.',
      });
    });
    routes.get('/api/lan/devices', async () => listLocalDevices());
    routes.post<{ Params: { relayId: string; deviceId: string }; Body: unknown }>(
      '/api/lan/relays/:relayId/devices/:deviceId/commands',
      async (req) => controlLocalMedia(req.params.relayId, req.params.deviceId, req.body),
    );
  });
}
