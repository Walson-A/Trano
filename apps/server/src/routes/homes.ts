import type { FastifyInstance } from 'fastify';
import { publicHomes, resolveHome, withHome } from '../lib/homes.ts';
import { db } from '../db.ts';
import { broadcast } from '../ws.ts';
import { fetchEntities } from '../lib/ha.ts';

/** Run the entire Fastify lifecycle inside a request-local home context. */
export function homeScope(app: FastifyInstance): void {
  app.addHook('onRequest', (req, reply, done) => {
    try {
      const query = req.query as { home_id?: unknown };
      withHome(resolveHome(query.home_id ?? 'main'), done);
    } catch {
      void reply.code(400).send({ error: 'Logement inconnu ou configuration invalide.' });
    }
  });
}
export function homeRoutes(app: FastifyInstance): void {
  app.get('/api/homes', () => publicHomes());
  app.get<{ Params: { id: string } }>('/api/homes/:id/candidates', async (req, reply) => {
    let home;
    try { home = resolveHome(req.params.id); } catch { return reply.code(404).send({ error: 'Logement inconnu.' }); }
    if (home.provider !== 'ha' || home.id === 'main') return reply.code(400).send({ error: 'Affectation disponible pour un logement HA supplémentaire.' });
    try {
      const source = home.haSource ?? home.id;
      const reserved = db.prepare('SELECT entity_id FROM home_devices WHERE source_id = ? AND home_id != ?').all(source, home.id) as { entity_id: string }[];
      const blocked = new Set(reserved.map(row => row.entity_id));
      return await withHome(home, async () => (await fetchEntities(true)).devices.filter(device => !blocked.has(device.entity_id)));
    } catch { return reply.code(502).send({ error: 'Impossible de joindre Home Assistant. Vérifier la connexion du serveur.' }); }
  });
  app.put<{ Params: { id: string }; Body: { entityIds?: string[] } }>('/api/homes/:id/devices', async (req, reply) => {
    let home;
    try { home = resolveHome(req.params.id); } catch { return reply.code(404).send({ error: 'Logement inconnu.' }); }
    const ids = req.body?.entityIds;
    if (home.provider !== 'ha' || home.id === 'main' || !Array.isArray(ids) || ids.length > 200 || ids.some(id => typeof id !== 'string')) return reply.code(400).send({ error: 'Affectation invalide.' });
    const source = home.haSource ?? home.id;
    const entities = await withHome(home, async () => (await fetchEntities(true)).devices);
    if (ids.some(id => !entities.some(entity => entity.entity_id === id))) return reply.code(400).send({ error: 'Un appareil n’existe pas dans ce Home Assistant.' });
    const other = db.prepare('SELECT entity_id FROM home_devices WHERE source_id = ? AND home_id != ?').all(source, home.id) as { entity_id: string }[];
    if (ids.some(id => other.some(row => row.entity_id === id))) return reply.code(409).send({ error: 'Un appareil appartient déjà à un autre logement.' });
    const previous = db.prepare('SELECT entity_id FROM home_devices WHERE source_id = ? AND home_id = ?').all(source, home.id) as { entity_id: string }[];
    const newlyAssigned = new Set(ids.filter(id => !previous.some(row => row.entity_id === id)));
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('DELETE FROM home_devices WHERE source_id = ? AND home_id = ?').run(source, home.id);
      const insert = db.prepare('INSERT INTO home_devices (source_id, entity_id, home_id) VALUES (?, ?, ?)');
      for (const id of new Set(ids)) insert.run(source, id, home.id);
      // A device that physically moved keeps the existing profile's favorite.
      // Only newly assigned IDs inherit it: later edits must not undo an explicit
      // removal from this home's favorites.
      if (home.haSource === 'main' && newlyAssigned.size) {
        const profiles = db.prepare('SELECT id, favorites FROM profiles').all() as { id: string; favorites: string }[];
        for (const profile of profiles) {
          let inherited: string[];
          try {
            const favorites: unknown = JSON.parse(profile.favorites);
            inherited = Array.isArray(favorites) ? favorites.filter((id): id is string => typeof id === 'string' && newlyAssigned.has(id)) : [];
          } catch { continue; }
          if (!inherited.length) continue;
          const existing = db.prepare('SELECT entity_ids FROM home_favorites WHERE home_id = ? AND profile_id = ?')
            .get(home.id, profile.id) as { entity_ids: string } | undefined;
          const favorites = [...new Set([...(existing ? JSON.parse(existing.entity_ids) as string[] : []), ...inherited])];
          db.prepare('INSERT INTO home_favorites (home_id, profile_id, entity_ids) VALUES (?, ?, ?) ON CONFLICT(home_id, profile_id) DO UPDATE SET entity_ids = excluded.entity_ids')
            .run(home.id, profile.id, JSON.stringify(favorites));
        }
      }
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    broadcast('profiles');
    return { ok: true };
  });
  app.put<{ Params: { id: string }; Body: { profileId?: string; favorites?: string[] } }>('/api/homes/:id/favorites', (req, reply) => {
    let home;
    try { home = resolveHome(req.params.id); } catch { return reply.code(404).send({ error: 'Logement inconnu.' }); }
    const { profileId, favorites } = req.body ?? {};
    if (home.id === 'main') return reply.code(400).send({ error: 'Les favoris historiques se règlent dans le profil.' });
    if (typeof profileId !== 'string' || !db.prepare('SELECT id FROM profiles WHERE id = ?').get(profileId)
      || !Array.isArray(favorites) || favorites.length > 100 || favorites.some(id => typeof id !== 'string' || !/^[a-z_]+\.[a-zA-Z0-9_-]+$/.test(id))) {
      return reply.code(400).send({ error: 'Profil ou favoris invalides.' });
    }
    db.prepare('INSERT INTO home_favorites (home_id, profile_id, entity_ids) VALUES (?, ?, ?) ON CONFLICT(home_id, profile_id) DO UPDATE SET entity_ids = excluded.entity_ids')
      .run(home.id, profileId, JSON.stringify([...new Set(favorites)]));
    broadcast('profiles');
    return { ok: true };
  });
}
