import type { FastifyInstance } from 'fastify';
import { getHouseSnapshot, controlDevice, listControllableDevices, haConfigured } from '../lib/ha.ts';

/**
 * Assistant IA de la maison, via OpenRouter.
 * La clé n'existe QUE côté serveur (env / options de l'add-on).
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
// trim() : un .env édité sous Windows peut laisser un \r en fin de valeur,
// ce qui corrompt l'en-tête Authorization (401 garanti).
const apiKey = () => process.env.TRANO_OPENROUTER_KEY?.trim() || null;
// Testé le 2026-07-03 : gratuit ET support fiable des tools.
const model = () => process.env.TRANO_OPENROUTER_MODEL?.trim() || 'nvidia/nemotron-3-super-120b-a12b:free';

const SYSTEM_PROMPT = `Tu es Trano, l'assistant de la maison familiale (malgache : "trano" = maison).
Tu réponds en français, chaleureusement et brièvement — tes réponses s'affichent sur une tablette murale, pas de pavés.
La maison vise l'autonomie énergétique totale (solaire + batteries, 0 € chez EDF) : sois proactif sur ce sujet.
Utilise tes outils pour répondre avec les VRAIES données de la maison — n'invente jamais une valeur.
Si on te demande une action non couverte par tes outils, dis-le simplement.`;

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'etat_maison',
      description:
        "Photographie temps réel de la maison : météo, énergie (solaire, batterie, réseau EDF), lumières allumées, lecture en cours, présence des membres, wifi, appels manqués.",
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'liste_appareils',
      description: 'Liste les appareils contrôlables (lumières, prises, ventilateurs, lecteurs) avec leur entity_id et leur état.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'controler_appareil',
      description: "Allume, éteint ou bascule un appareil. Utilise d'abord liste_appareils pour trouver l'entity_id exact.",
      parameters: {
        type: 'object',
        properties: {
          entity_id: { type: 'string', description: "L'entity_id exact (ex: light.chambre_kevin)" },
          action: { type: 'string', enum: ['turn_on', 'turn_off', 'toggle'] },
        },
        required: ['entity_id', 'action'],
      },
    },
  },
];

async function runTool(name: string, args: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case 'etat_maison':
        return JSON.stringify(await getHouseSnapshot());
      case 'liste_appareils':
        return JSON.stringify(await listControllableDevices());
      case 'controler_appareil':
        return await controlDevice(String(args.entity_id), args.action as 'turn_on' | 'turn_off' | 'toggle');
      default:
        return `Outil inconnu : ${name}`;
    }
  } catch (err) {
    return `Erreur de l'outil ${name} : ${err instanceof Error ? err.message : String(err)}`;
  }
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

export function assistantRoutes(app: FastifyInstance): void {
  app.get('/api/assistant/status', () => ({
    configured: Boolean(apiKey()),
    haReady: haConfigured(),
    model: model(),
  }));

  app.post<{ Body: { messages: Array<{ role: 'user' | 'assistant'; content: string }> } }>(
    '/api/assistant/chat',
    async (req, reply) => {
      const key = apiKey();
      if (!key) {
        return reply.code(503).send({ error: "Assistant non configuré : clé OpenRouter absente (option openrouter_key de l'add-on)." });
      }
      const userMessages = (req.body?.messages ?? []).slice(-20);
      if (userMessages.length === 0 || userMessages[userMessages.length - 1].role !== 'user') {
        return reply.code(400).send({ error: 'Il faut au moins un message utilisateur.' });
      }

      const messages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...userMessages.map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
      ];

      // Boucle d'outils : le modèle peut enchaîner jusqu'à 5 appels
      for (let turn = 0; turn < 5; turn++) {
        const res = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://trano.local',
            'X-Title': 'Trano',
          },
          body: JSON.stringify({ model: model(), messages, tools: TOOLS }),
          signal: AbortSignal.timeout(60_000),
        });

        if (!res.ok) {
          const detail = await res.text().catch(() => '');
          req.log.error({ status: res.status, detail }, 'OpenRouter error');
          const hint =
            res.status === 401
              ? 'Clé OpenRouter refusée — vérifiez openrouter_key (espaces, copie incomplète).'
              : res.status === 404 || res.status === 400
                ? `Le modèle "${model()}" est introuvable — il faut un identifiant complet (ex: deepseek/deepseek-chat-v3.1:free).`
                : res.status === 429
                  ? 'Limite de débit atteinte sur ce modèle gratuit — réessayez dans un instant.'
                  : `OpenRouter a répondu ${res.status}.`;
          return reply.code(502).send({ error: hint });
        }

        const data = (await res.json()) as {
          choices: Array<{ message: ChatMessage; finish_reason: string }>;
        };
        const message = data.choices?.[0]?.message;
        if (!message) {
          return reply.code(502).send({ error: 'Réponse OpenRouter vide.' });
        }

        if (message.tool_calls?.length) {
          messages.push(message);
          for (const call of message.tool_calls) {
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(call.function.arguments || '{}');
            } catch {
              // arguments illisibles : l'outil recevra un objet vide
            }
            const result = await runTool(call.function.name, args);
            messages.push({ role: 'tool', content: result, tool_call_id: call.id });
          }
          continue;
        }

        return { reply: message.content ?? '…' };
      }

      return reply.code(502).send({ error: "L'assistant a bouclé sur ses outils sans conclure." });
    }
  );
}
