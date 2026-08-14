import type { FastifyInstance } from 'fastify';
import {
  getHouseSnapshot, listControllableDevices, controlDevice, setLightState, haConfigured,
  type ControllableDevice,
} from '../lib/ha.ts';
import { db } from '../db.ts';

/**
 * L'état de la maison en un objet, pour un client d'application.
 *
 * Pourquoi une route à part alors que `/api/mcp` sert déjà les mêmes données :
 * un outil MCP renvoie du JSON **sérialisé dans une chaîne**, dans une trame SSE.
 * C'est ce qu'il faut à un LLM et c'est pénible pour un widget qui veut un objet
 * typé toutes les dix secondes. Deux surfaces, deux protocoles — mais la même
 * couche métier dessous (`lib/ha.ts`), donc jamais deux vérités.
 *
 * Premier client : le widget domotique de LifeOS (`docs/mcp_oby.md` § widget).
 */

/** Ce qu'on considère « allumé » selon le domaine HA. */
const ON_STATES = new Set(['on', 'open', 'playing']);

function favoritesOf(profileId: string | undefined): string[] | null {
  if (!profileId) return null;
  const row = db.prepare('SELECT favorites FROM profiles WHERE id = ?').get(profileId) as
    | { favorites: string }
    | undefined;
  if (!row) return null;
  try {
    const list = JSON.parse(row.favorites);
    return Array.isArray(list) ? list.map(String) : [];
  } catch {
    return [];
  }
}

export function houseRoutes(app: FastifyInstance): void {
  app.get<{ Querystring: { profile?: string } }>('/api/house', async (req, reply) => {
    if (!haConfigured()) {
      return reply.code(503).send({ error: 'Home Assistant non configuré côté serveur.' });
    }

    let snapshot: Record<string, unknown>;
    let devices: ControllableDevice[];
    try {
      // Deux appels HA : les états (énergie, météo) et le template des pièces.
      [snapshot, devices] = await Promise.all([getHouseSnapshot(), listControllableDevices()]);
    } catch (err) {
      req.log.error({ err }, 'GET /api/house');
      return reply.code(502).send({ error: err instanceof Error ? err.message : 'Home Assistant injoignable.' });
    }

    const wanted = favoritesOf(req.query.profile);
    const byId = new Map(devices.map((d) => [d.entity_id, d]));

    // L'ordre des favoris est celui du profil — c'est un classement, pas un ensemble.
    // Un favori disparu de HA (renommé, débranché) est simplement absent : on ne
    // fabrique pas une ligne morte.
    const favorites = (wanted ?? []).map((id) => byId.get(id)).filter((d): d is ControllableDevice => Boolean(d));

    return {
      energie: snapshot.energie ?? null,
      meteo: snapshot.meteo ?? null,
      // Seuls les favoris portent leurs réglages de lumière : ce sont les seules
      // lignes qu'un client affiche en détail. `allumes` sert à compter — lui
      // joindre les attributs de chaque ampoule allumée gonflerait la réponse
      // toutes les dix secondes pour un nombre.
      favoris: favorites,
      allumes: devices.map(({ lumiere: _l, ...d }) => d).filter((d) => ON_STATES.has(d.etat)),
      total_appareils: devices.length,
      // `null` = aucun profil demandé ; `[]` = profil sans favori. Le client doit
      // pouvoir distinguer « tu n'as rien choisi » de « ta liste est vide ».
      profil_connu: wanted !== null,
    };
  });

  app.post<{ Body: { entity_id?: string; action?: string } }>('/api/house/device', async (req, reply) => {
    const entityId = req.body?.entity_id?.trim();
    const action = req.body?.action ?? 'toggle';
    if (!entityId) return reply.code(400).send({ error: 'entity_id manquant.' });
    if (action !== 'turn_on' && action !== 'turn_off' && action !== 'toggle') {
      return reply.code(400).send({ error: "action doit être turn_on, turn_off ou toggle." });
    }
    if (!haConfigured()) {
      return reply.code(503).send({ error: 'Home Assistant non configuré côté serveur.' });
    }

    try {
      // `controlDevice` porte déjà les garde-fous : entity_id validé, domaines
      // autorisés, serrures et alarme exclues. On ne les réécrit pas ici.
      const message = await controlDevice(entityId, action);
      const refused = message.startsWith('Refusé');
      return reply.code(refused ? 403 : 200).send({ ok: !refused, message });
    } catch (err) {
      req.log.error({ err }, 'POST /api/house/device');
      return reply.code(502).send({ error: err instanceof Error ? err.message : 'Home Assistant injoignable.' });
    }
  });

  /**
   * Les réglages fins d'une lumière : luminosité, blanc, couleur.
   *
   * Route séparée de `/api/house/device` volontairement : celle-là a trois
   * actions et vaut pour cinq domaines, celle-ci n'a de sens que pour `light`
   * et prend des valeurs continues. Les mélanger aurait donné un corps de
   * requête dont la moitié des champs est toujours refusée.
   */
  app.post<{
    Body: { entity_id?: string; brightness_pct?: number; kelvin?: number; hs_color?: [number, number] };
  }>('/api/house/light', async (req, reply) => {
    const entityId = req.body?.entity_id?.trim();
    if (!entityId) return reply.code(400).send({ error: 'entity_id manquant.' });
    if (!haConfigured()) {
      return reply.code(503).send({ error: 'Home Assistant non configuré côté serveur.' });
    }

    const { brightness_pct, kelvin, hs_color } = req.body;
    const finite = (v: unknown) => v === undefined || (typeof v === 'number' && Number.isFinite(v));
    if (!finite(brightness_pct) || !finite(kelvin)) {
      return reply.code(400).send({ error: 'brightness_pct et kelvin doivent être des nombres.' });
    }
    if (hs_color !== undefined && (!Array.isArray(hs_color) || hs_color.length !== 2 || !hs_color.every(finite))) {
      return reply.code(400).send({ error: 'hs_color doit être [teinte, saturation].' });
    }
    if (brightness_pct === undefined && kelvin === undefined && hs_color === undefined) {
      return reply.code(400).send({ error: 'Aucun réglage fourni.' });
    }

    try {
      // Les bornes et le refus des non-lumières sont dans `setLightState` ;
      // on ne les réécrit pas ici.
      const message = await setLightState(entityId, { brightness_pct, kelvin, hs_color });
      const refused = message.startsWith('Refusé');
      return reply.code(refused ? 403 : 200).send({ ok: !refused, message });
    } catch (err) {
      req.log.error({ err }, 'POST /api/house/light');
      return reply.code(502).send({ error: err instanceof Error ? err.message : 'Home Assistant injoignable.' });
    }
  });
}
