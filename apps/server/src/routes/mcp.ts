import type { FastifyInstance } from 'fastify';
import { timingSafeEqual } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { OBY_TOOL_DEFS, isExposedToOby, runTool, toolInputSchema } from '../lib/tools.ts';

/**
 * Serveur MCP — la maison, vue par Oby.
 *
 * Oby (l'engine, sur la même machine) se connecte ici en streamable-HTTP et
 * appelle les outils de `lib/tools.ts` marqués `oby`. Le reste de la table —
 * courses, interphone, Freebox — n'est jamais déclaré ni exécutable par ce
 * chemin : la liste blanche est vérifiée deux fois, à la déclaration ET à
 * l'appel, parce qu'un client MCP peut demander un outil qu'on n'a pas listé.
 *
 * Mode **stateless** : un serveur et un transport neufs par requête, aucune
 * session à garder ni à expirer. Un appel d'outil est court et l'engine ne
 * s'abonne à rien — la machinerie de session ne servirait qu'à se périmer.
 */

const SERVER_INFO = { name: 'trano', version: '1.0.0' };

const INSTRUCTIONS = [
  "Outils de la maison familiale (domotique Home Assistant, via Trano).",
  "Lecture : état de la maison, météo, énergie solaire et batteries, pièces, appareils.",
  "Action : allumer/éteindre lumières, prises, ventilateurs, volets, régler une lumière, activer une scène.",
  "Trouve toujours l'entity_id avec lister_appareils avant d'agir.",
].join('\n');

const mcpToken = (): string | null => process.env.TRANO_MCP_TOKEN?.trim() || null;

/** Comparaison à temps constant — le jeton pilote la maison. */
function tokenMatches(header: string | undefined, expected: string): boolean {
  const prefix = 'Bearer ';
  if (!header?.startsWith(prefix)) return false;
  const given = Buffer.from(header.slice(prefix.length).trim());
  const wanted = Buffer.from(expected);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

function buildServer(): Server {
  const server = new Server(SERVER_INFO, {
    capabilities: { tools: {} },
    instructions: INSTRUCTIONS,
  });

  server.setRequestHandler(ListToolsRequestSchema, () => ({
    tools: OBY_TOOL_DEFS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: toolInputSchema(t),
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    if (!isExposedToOby(name)) {
      return {
        content: [{ type: 'text' as const, text: `Outil « ${name} » non exposé à Oby.` }],
        isError: true,
      };
    }
    // `profile: null` : Oby n'est pas un membre de la famille. Sans effet ici —
    // seuls les courses et l'interphone signent leurs écritures, et ils sont hors
    // liste blanche.
    const text = await runTool(name, (args ?? {}) as Record<string, unknown>, { profile: null });
    return { content: [{ type: 'text' as const, text }] };
  });

  return server;
}

export function mcpRoutes(app: FastifyInstance): void {
  if (!mcpToken()) {
    app.log.warn('MCP désactivé : TRANO_MCP_TOKEN absent — Oby ne pourra pas piloter la maison.');
  }

  app.post('/api/mcp', async (req, reply) => {
    const expected = mcpToken();
    // Pas de jeton = route fermée, jamais ouverte. Le serveur écoute sur 0.0.0.0 :
    // un défaut permissif ouvrirait la maison à tout le réseau.
    if (!expected) {
      return reply.code(503).send({ error: 'MCP désactivé : TRANO_MCP_TOKEN absent.' });
    }
    if (!tokenMatches(req.headers.authorization, expected)) {
      return reply.code(401).send({ error: 'Jeton MCP invalide.' });
    }

    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    reply.raw.on('close', () => {
      void transport.close();
      void server.close();
    });

    await server.connect(transport);
    reply.hijack(); // à partir d'ici, c'est le transport qui écrit la réponse
    await transport.handleRequest(req.raw, reply.raw, req.body);
  });

  // Stateless : pas de flux SSE serveur→client à rouvrir (GET), pas de session à
  // supprimer (DELETE). On répond franchement plutôt que de laisser le fallback SPA
  // renvoyer index.html à un client MCP.
  app.route({
    method: ['GET', 'DELETE'],
    url: '/api/mcp',
    handler: async (_req, reply) =>
      reply.code(405).header('Allow', 'POST').send({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Serveur MCP sans session : seul POST est accepté.' },
        id: null,
      }),
  });
}
