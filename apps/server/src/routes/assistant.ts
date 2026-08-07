import type { FastifyInstance } from 'fastify';
import { haConfigured } from '../lib/ha.ts';
import { OPENROUTER_TOOLS, runTool, type ToolCtx } from '../lib/tools.ts';

/**
 * Assistant IA de la maison, via OpenRouter.
 * La clé n'existe QUE côté serveur (env / options du conteneur).
 *
 * Les outils eux-mêmes vivent dans `lib/tools.ts` — partagés avec le serveur MCP
 * qui les sert à Oby (`routes/mcp.ts`).
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const apiKey = () => process.env.TRANO_OPENROUTER_KEY?.trim() || null;
const model = () => process.env.TRANO_OPENROUTER_MODEL?.trim() || 'nvidia/nemotron-3-super-120b-a12b:free';

const SYSTEM_PROMPT = `Tu es Trano, l'assistant de la maison familiale (malgache : "trano" = maison).
Tu réponds en français, chaleureusement et brièvement — tes réponses s'affichent sur une tablette murale.
Formate en Markdown simple (gras, listes à puces) mais évite les gros tableaux.
La maison vise l'autonomie énergétique totale (solaire + batteries, 0 € chez EDF) : sois proactif là-dessus.
Utilise TOUJOURS tes outils pour répondre avec les VRAIES données — n'invente jamais une valeur ni un entity_id.
Pour agir sur un appareil, trouve d'abord son entity_id via lister_appareils.`;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
}

/** Appel OpenRouter avec une tentative de reprise sur erreur transitoire. */
async function callOpenRouter(key: string, messages: ChatMessage[]): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://trano.local',
          'X-Title': 'Trano',
        },
        body: JSON.stringify({ model: model(), messages, tools: OPENROUTER_TOOLS }),
        signal: AbortSignal.timeout(45_000),
      });
      // 5xx = transitoire (souvent "Provider returned error" des modèles gratuits)
      if (res.status >= 500 && attempt === 0) {
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('OpenRouter injoignable');
}

export function assistantRoutes(app: FastifyInstance): void {
  app.get('/api/assistant/status', () => ({
    configured: Boolean(apiKey()),
    haReady: haConfigured(),
    model: model(),
  }));

  app.post<{
    Body: {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      profile?: ToolCtx['profile'];
    };
  }>('/api/assistant/chat', async (req, reply) => {
    const key = apiKey();
    if (!key) {
      return reply.code(503).send({ error: "Assistant non configuré : clé OpenRouter absente (variable TRANO_OPENROUTER_KEY)." });
    }
    const userMessages = (req.body?.messages ?? []).slice(-20);
    if (userMessages.length === 0 || userMessages[userMessages.length - 1].role !== 'user') {
      return reply.code(400).send({ error: 'Il faut au moins un message utilisateur.' });
    }

    const ctx: ToolCtx = { profile: req.body?.profile ?? null };
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...userMessages.map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
    ];

    try {
      // Boucle d'outils : le modèle peut enchaîner jusqu'à 6 appels
      for (let turn = 0; turn < 6; turn++) {
        const res = await callOpenRouter(key, messages);

        if (!res.ok) {
          const detail = await res.text().catch(() => '');
          req.log.error({ status: res.status, detail }, 'OpenRouter error');
          const hint =
            res.status === 401 ? 'Clé OpenRouter refusée — vérifiez TRANO_OPENROUTER_KEY.'
              : res.status === 402 ? 'Crédit OpenRouter insuffisant pour ce modèle.'
              : res.status === 404 || res.status === 400 ? `Modèle "${model()}" introuvable ou requête invalide.`
              : res.status === 429 ? 'Modèle gratuit saturé, réessayez dans un instant.'
              : `OpenRouter a répondu ${res.status}.`;
          return reply.code(502).send({ error: hint });
        }

        const data = (await res.json()) as { choices?: Array<{ message: ChatMessage }> };
        const message = data.choices?.[0]?.message;
        if (!message) return reply.code(502).send({ error: 'Réponse vide du modèle, réessayez.' });

        if (message.tool_calls?.length) {
          messages.push(message);
          for (const call of message.tool_calls) {
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(call.function.arguments || '{}');
            } catch {
              // arguments illisibles : l'outil recevra un objet vide
            }
            const result = await runTool(call.function.name, args, ctx);
            messages.push({ role: 'tool', content: result, tool_call_id: call.id });
          }
          continue;
        }

        return { reply: message.content ?? '…' };
      }
      return reply.code(502).send({ error: "L'assistant a enchaîné trop d'outils sans conclure." });
    } catch (err) {
      req.log.error({ err }, 'Assistant chat failed');
      return reply.code(502).send({ error: 'L\'assistant est momentanément indisponible (délai dépassé), réessayez.' });
    }
  });
}
