import { SHOPPING_CATEGORIES, SHOPPING_CATEGORY_LABELS } from '@trano/shared';
import {
  getHouseSnapshot, controlDevice, listControllableDevices, getDeviceInfo,
  getWeatherDetail, getEnergyDetail, notifyPhone,
  setLight, listScenes, activateScene, controlFreebox,
} from './ha.ts';
import { db, newId } from '../db.ts';
import { broadcast, broadcastMessage } from '../ws.ts';

/**
 * Les outils de la maison — la table unique.
 *
 * Deux surfaces les consomment : l'assistant des écrans (`routes/assistant.ts`,
 * boucle OpenRouter) et Oby (`routes/mcp.ts`, serveur MCP). Une seule définition
 * donc, et surtout **un seul endroit où la sécurité se décide** : le drapeau `oby`
 * ci-dessous est la liste blanche, pas une politique répétée dans chaque appelant.
 */

// Téléphones joignables via l'app compagnon HA (miroir de web/config/network.ts)
const PHONE_SERVICES = ['mobile_app_iphone_de_walson', 'mobile_app_iphonerenew'];

export interface ToolCtx {
  profile: { id: string; name: string; avatar: string; color: string } | null;
}

export interface ToolDef {
  name: string;
  description: string;
  params: Record<string, unknown>;
  required?: string[];
  /**
   * Exposé à Oby via MCP. Réservé à la lecture et au pilotage des appareils.
   *
   * Restent dehors, délibérément : les courses et l'interphone (ils écrivent dans
   * la vie de la famille — l'interphone sonne sur les téléphones de tout le monde)
   * et `controler_freebox` (couper le wifi coupe accessoirement le lien entre Oby
   * et la maison). Les serrures et l'alarme, elles, sont déjà exclues plus bas
   * par `controlDevice` lui-même.
   */
  oby?: boolean;
}

export const TOOL_DEFS: ToolDef[] = [
  { name: 'etat_maison', description: "Vue d'ensemble temps réel : météo, énergie, lumières allumées, lecture en cours, présence des membres, wifi, appels manqués.", params: {}, oby: true },
  { name: 'meteo', description: 'Météo détaillée (température, ressenti, humidité, vent, pression).', params: {}, oby: true },
  { name: 'energie', description: 'Bilan énergétique détaillé : production solaire par source, réseau EDF (import/export), chaque batterie, production du jour/semaine/totale.', params: {}, oby: true },
  { name: 'lister_pieces', description: 'Liste les pièces de la maison (nom, étage).', params: {}, oby: true },
  { name: 'lister_appareils', description: 'Liste les appareils contrôlables (lumières, prises, ventilateurs, lecteurs, volets) avec entity_id, état et pièce.', params: {}, oby: true },
  {
    name: 'infos_appareil', description: "Détail d'un appareil : état, pièce, attributs.",
    params: { entity_id: { type: 'string', description: "L'entity_id exact" } }, required: ['entity_id'], oby: true,
  },
  {
    name: 'controler_appareil', description: 'Allume/éteint/bascule un appareil (lumière, prise, ventilateur, lecteur, volet).',
    params: {
      entity_id: { type: 'string' },
      action: { type: 'string', enum: ['turn_on', 'turn_off', 'toggle'] },
    }, required: ['entity_id', 'action'], oby: true,
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
    }, required: ['entity_id'], oby: true,
  },
  { name: 'lister_scenes', description: 'Liste les scènes disponibles.', params: {}, oby: true },
  {
    name: 'activer_scene', description: 'Active une scène (via son entity_id, obtenu par lister_scenes).',
    params: { entity_id: { type: 'string' } }, required: ['entity_id'], oby: true,
  },
  {
    name: 'controler_freebox', description: 'Pilote la Freebox : activer/couper le wifi, ou redémarrer la box.',
    params: { action: { type: 'string', enum: ['wifi_on', 'wifi_off', 'reboot'] } }, required: ['action'],
  },
];

/** Schéma JSON des paramètres d'un outil — la forme attendue par OpenAI comme par MCP. */
export function toolInputSchema(t: ToolDef): { type: 'object'; properties: Record<string, unknown>; required: string[] } {
  return { type: 'object', properties: t.params, required: t.required ?? [] };
}

/** Les outils au format function-calling d'OpenRouter (tous). */
export const OPENROUTER_TOOLS = TOOL_DEFS.map((t) => ({
  type: 'function' as const,
  function: {
    name: t.name,
    description: t.description,
    parameters: toolInputSchema(t),
  },
}));

/** Les outils exposés à Oby (lecture + pilotage des appareils). */
export const OBY_TOOL_DEFS = TOOL_DEFS.filter((t) => t.oby);

/** Liste blanche vérifiée au moment de l'appel, pas seulement à la déclaration. */
const OBY_TOOL_NAMES = new Set(OBY_TOOL_DEFS.map((t) => t.name));

export function isExposedToOby(name: string): boolean {
  return OBY_TOOL_NAMES.has(name);
}

export async function runTool(name: string, args: Record<string, unknown>, ctx: ToolCtx): Promise<string> {
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
