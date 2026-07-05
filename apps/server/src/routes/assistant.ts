import type { FastifyInstance } from 'fastify';
import { SHOPPING_CATEGORIES, SHOPPING_CATEGORY_LABELS } from '@trano/shared';
import {
  getHouseSnapshot, controlDevice, listControllableDevices, getDeviceInfo,
  getWeatherDetail, getEnergyDetail, notifyPhone, haConfigured,
  setLight, listScenes, activateScene, controlFreebox,
} from '../lib/ha.ts';
import { db, newId } from '../db.ts';
import { broadcast, broadcastMessage } from '../ws.ts';

/**
 * Assistant IA de la maison, via OpenRouter.
 * La clé n'existe QUE côté serveur (env / options de l'add-on).
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const apiKey = () => process.env.TRANO_OPENROUTER_KEY?.trim() || null;
const model = () => process.env.TRANO_OPENROUTER_MODEL?.trim() || 'nvidia/nemotron-3-super-120b-a12b:free';

// Téléphones joignables via l'app compagnon HA (miroir de web/config/network.ts)
const PHONE_SERVICES = ['mobile_app_iphone_de_walson', 'mobile_app_iphonerenew'];

const SYSTEM_PROMPT = `Tu es Trano, l'assistant de la maison familiale (malgache : "trano" = maison).
Tu réponds en français, chaleureusement et brièvement — tes réponses s'affichent sur une tablette murale.
Formate en Markdown simple (gras, listes à puces) mais évite les gros tableaux.
La maison vise l'autonomie énergétique totale (solaire + batteries, 0 € chez EDF) : sois proactif là-dessus.
Utilise TOUJOURS tes outils pour répondre avec les VRAIES données — n'invente jamais une valeur ni un entity_id.
Pour agir sur un appareil, trouve d'abord son entity_id via lister_appareils.`;

interface ToolCtx {
  profile: { id: string; name: string; avatar: string; color: string } | null;
}

const TOOLS = [
  { name: 'etat_maison', description: "Vue d'ensemble temps réel : météo, énergie, lumières allumées, lecture en cours, présence des membres, wifi, appels manqués.", params: {} },
  { name: 'meteo', description: 'Météo détaillée (température, ressenti, humidité, vent, pression).', params: {} },
  { name: 'energie', description: 'Bilan énergétique détaillé : production solaire par source, réseau EDF (import/export), chaque batterie, production du jour/semaine/totale.', params: {} },
  { name: 'lister_pieces', description: 'Liste les pièces de la maison (nom, étage).', params: {} },
  { name: 'lister_appareils', description: 'Liste les appareils contrôlables (lumières, prises, ventilateurs, lecteurs, volets) avec entity_id, état et pièce.', params: {} },
  {
    name: 'infos_appareil', description: "Détail d'un appareil : état, pièce, attributs.",
    params: { entity_id: { type: 'string', description: "L'entity_id exact" } }, required: ['entity_id'],
  },
  {
    name: 'controler_appareil', description: 'Allume/éteint/bascule un appareil (lumière, prise, ventilateur, lecteur, volet).',
    params: {
      entity_id: { type: 'string' },
      action: { type: 'string', enum: ['turn_on', 'turn_off', 'toggle'] },
    }, required: ['entity_id', 'action'],
  },
  { name: 'courses_lister', description: 'Liste les articles de la liste de courses (à acheter et achetés).', params: {} },
  { name: 'courses_categories', description: 'Liste les catégories de courses disponibles.', params: {} },
  {
    name: 'courses_ajouter', description: 'Ajoute un article à la liste de courses.',
    params: {
      titre: { type: 'string' },
      categorie: { type: 'string', enum: [...SHOPPING_CATEGORIES] },
      quantite: { type: 'string', description: 'optionnel, ex "2", "1kg"' },
    }, required: ['titre'],
  },
  {
    name: 'courses_cocher', description: 'Marque un article comme acheté (ou le remet à acheter).',
    params: {
      id: { type: 'string', description: "l'id de l'article (via courses_lister)" },
      achete: { type: 'boolean' },
    }, required: ['id', 'achete'],
  },
  {
    name: 'courses_supprimer', description: 'Supprime un article de la liste.',
    params: { id: { type: 'string' } }, required: ['id'],
  },
  {
    name: 'interphone', description: "Envoie un message d'interphone dans la maison (annonce vocale à l'écran et/ou notification sur les téléphones).",
    params: {
      message: { type: 'string' },
      destinataire: { type: 'string', enum: ['ecrans', 'telephones', 'tous'], description: 'par défaut tous' },
    }, required: ['message'],
  },
  {
    name: 'regler_lumiere', description: "Règle une lumière : luminosité (0-100 %) et/ou couleur (rouge, bleu, blanc chaud…). Trouve l'entity_id via lister_appareils.",
    params: {
      entity_id: { type: 'string' },
      luminosite: { type: 'number', description: '0 à 100' },
      couleur: { type: 'string', description: 'nom de couleur, ex "rouge", "bleu", "blanc"' },
    }, required: ['entity_id'],
  },
  { name: 'lister_scenes', description: 'Liste les scènes disponibles.', params: {} },
  {
    name: 'activer_scene', description: 'Active une scène (via son entity_id, obtenu par lister_scenes).',
    params: { entity_id: { type: 'string' } }, required: ['entity_id'],
  },
  {
    name: 'controler_freebox', description: 'Pilote la Freebox : activer/couper le wifi, ou redémarrer la box.',
    params: { action: { type: 'string', enum: ['wifi_on', 'wifi_off', 'reboot'] } }, required: ['action'],
  },
].map((t) => ({
  type: 'function' as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: { type: 'object', properties: t.params, required: t.required ?? [] },
  },
}));

async function runTool(name: string, args: Record<string, unknown>, ctx: ToolCtx): Promise<string> {
  try {
    switch (name) {
      case 'etat_maison':
        return JSON.stringify(await getHouseSnapshot());
      case 'meteo':
        return JSON.stringify(await getWeatherDetail());
      case 'energie':
        return JSON.stringify(await getEnergyDetail());
      case 'lister_pieces':
        return JSON.stringify(db.prepare('SELECT id, name AS nom, floor AS etage FROM rooms ORDER BY sort_order').all());
      case 'lister_appareils':
        return JSON.stringify(await listControllableDevices());
      case 'infos_appareil':
        return JSON.stringify(await getDeviceInfo(String(args.entity_id)));
      case 'controler_appareil':
        return await controlDevice(String(args.entity_id), args.action as 'turn_on' | 'turn_off' | 'toggle');

      case 'courses_lister':
        return JSON.stringify(
          db.prepare('SELECT id, title AS titre, category AS categorie, quantity AS quantite, status, author_id FROM shopping_items ORDER BY created_at DESC').all()
        );
      case 'courses_categories':
        return JSON.stringify(SHOPPING_CATEGORIES.map((c) => ({ id: c, label: SHOPPING_CATEGORY_LABELS[c] })));
      case 'courses_ajouter': {
        const titre = String(args.titre ?? '').trim();
        if (!titre) return 'Titre manquant.';
        const categorie = SHOPPING_CATEGORIES.includes(args.categorie as never) ? (args.categorie as string) : 'autre';
        const id = newId();
        db.prepare('INSERT INTO shopping_items (id, title, category, quantity, author_id) VALUES (?, ?, ?, ?, ?)')
          .run(id, titre, categorie, args.quantite ? String(args.quantite) : null, ctx.profile?.id ?? null);
        broadcast('shopping');
        return `Ajouté : "${titre}" (${categorie}).`;
      }
      case 'courses_cocher': {
        const acheté = Boolean(args.achete);
        const res = db.prepare(
          `UPDATE shopping_items SET status = ?, bought_at = ?, bought_by = ? WHERE id = ?`
        ).run(acheté ? 'bought' : 'todo', acheté ? new Date().toISOString() : null, acheté ? (ctx.profile?.id ?? null) : null, String(args.id));
        if (res.changes === 0) return 'Article introuvable.';
        broadcast('shopping');
        return acheté ? 'Marqué comme acheté.' : 'Remis dans la liste.';
      }
      case 'courses_supprimer': {
        const res = db.prepare('DELETE FROM shopping_items WHERE id = ?').run(String(args.id));
        if (res.changes === 0) return 'Article introuvable.';
        broadcast('shopping');
        return 'Article supprimé.';
      }

      case 'interphone': {
        const message = String(args.message ?? '').trim();
        if (!message) return 'Message vide.';
        const cible = (args.destinataire as string) ?? 'tous';
        const from = ctx.profile ?? { name: 'Trano', avatar: '📢', color: '#f59e0b' };
        if (cible === 'ecrans' || cible === 'tous') {
          broadcastMessage({ type: 'intercom', from: { name: from.name, avatar: from.avatar, color: from.color }, toProfileId: null, message });
        }
        if (cible === 'telephones' || cible === 'tous') {
          await Promise.allSettled(PHONE_SERVICES.map((s) => notifyPhone(s, `📢 ${from.name}`, message)));
        }
        return `Message d'interphone envoyé (${cible}) : "${message}".`;
      }

      case 'regler_lumiere':
        return await setLight(
          String(args.entity_id),
          typeof args.luminosite === 'number' ? args.luminosite : undefined,
          args.couleur ? String(args.couleur) : undefined
        );
      case 'lister_scenes':
        return JSON.stringify(await listScenes());
      case 'activer_scene':
        return await activateScene(String(args.entity_id));
      case 'controler_freebox':
        return await controlFreebox(args.action as 'wifi_on' | 'wifi_off' | 'reboot');

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
        body: JSON.stringify({ model: model(), messages, tools: TOOLS }),
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
      return reply.code(503).send({ error: "Assistant non configuré : clé OpenRouter absente (option openrouter_key de l'add-on)." });
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
            res.status === 401 ? 'Clé OpenRouter refusée — vérifiez openrouter_key.'
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
