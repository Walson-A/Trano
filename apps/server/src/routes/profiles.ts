import type { FastifyInstance } from 'fastify';
import type { Profile, ProfileCreate, ProfileUpdate } from '@trano/shared';
import { HOUSE_PROFILE_ID, db, newId } from '../db.ts';
import { broadcast } from '../ws.ts';

interface ProfileRow {
  id: string;
  name: string;
  avatar: string;
  color: string;
  kind: string;
  favorites: string;
  dashboard_layout: string;
  created_at: string;
}

/**
 * Les pièces de chaque profil, en une seule requête.
 *
 * Une requête par profil ferait N+1 appels pour un affichage qui les montre
 * tous — le sélecteur « Qui est-ce ? » les charge d'un bloc.
 */
function roomsByProfile(): Map<string, string[]> {
  const rows = db
    .prepare('SELECT profile_id, room_id FROM profile_rooms ORDER BY room_id')
    .all() as Array<{ profile_id: string; room_id: string }>;
  const map = new Map<string, string[]>();
  for (const r of rows) {
    const list = map.get(r.profile_id);
    if (list) list.push(r.room_id);
    else map.set(r.profile_id, [r.room_id]);
  }
  return map;
}

function toProfile(row: ProfileRow, roomIds: string[]): Profile {
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar,
    color: row.color,
    kind: row.kind === 'house' ? 'house' : 'person',
    roomIds,
    favorites: JSON.parse(row.favorites),
    dashboardLayout: JSON.parse(row.dashboard_layout ?? '[]'),
    createdAt: row.created_at,
  };
}

function readProfile(id: string): Profile | null {
  const row = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id) as unknown as ProfileRow | undefined;
  if (!row) return null;
  const rooms = db
    .prepare('SELECT room_id FROM profile_rooms WHERE profile_id = ? ORDER BY room_id')
    .all(id) as Array<{ room_id: string }>;
  return toProfile(row, rooms.map((r) => r.room_id));
}

/**
 * Remplace les pièces d'un profil. Le couple (profil, pièce) étant clé
 * primaire, on efface puis on réinsère : plus simple et plus sûr qu'un diff,
 * pour des listes de deux ou trois éléments.
 *
 * Une pièce inconnue est ignorée plutôt que de faire échouer la requête —
 * la contrainte de clé étrangère la rejetterait de toute façon, autant ne pas
 * perdre les autres au passage.
 */
function setRooms(profileId: string, roomIds: string[]): void {
  const known = new Set(
    (db.prepare('SELECT id FROM rooms').all() as Array<{ id: string }>).map((r) => r.id),
  );
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM profile_rooms WHERE profile_id = ?').run(profileId);
    const link = db.prepare('INSERT OR IGNORE INTO profile_rooms (profile_id, room_id) VALUES (?, ?)');
    for (const roomId of roomIds) if (known.has(roomId)) link.run(profileId, roomId);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export function profileRoutes(app: FastifyInstance): void {
  app.get('/api/profiles', () => {
    const rows = db.prepare('SELECT * FROM profiles ORDER BY created_at').all() as unknown as ProfileRow[];
    const rooms = roomsByProfile();
    return rows.map((row) => toProfile(row, rooms.get(row.id) ?? []));
  });

  app.post<{ Body: ProfileCreate }>('/api/profiles', (req, reply) => {
    const { name, avatar = '😀', color = '#f59e0b', roomIds = [] } = req.body ?? {};
    if (!name?.trim()) return reply.code(400).send({ error: 'Le nom est requis' });

    const id = newId();
    // `kind` n'est pas exposé à la création : le profil « Maison » est unique et
    // posé par la migration. En laisser créer d'autres n'aurait aucun sens.
    db.prepare(
      "INSERT INTO profiles (id, name, avatar, color, kind) VALUES (?, ?, ?, ?, 'person')",
    ).run(id, name.trim(), avatar, color);
    setRooms(id, roomIds);

    broadcast('profiles');
    return reply.code(201).send(readProfile(id));
  });

  app.patch<{ Params: { id: string }; Body: ProfileUpdate }>('/api/profiles/:id', (req, reply) => {
    const exists = db.prepare('SELECT 1 FROM profiles WHERE id = ?').get(req.params.id);
    if (!exists) return reply.code(404).send({ error: 'Profil introuvable' });

    const b = req.body ?? {};

    // Construction dynamique : on ne touche que les colonnes envoyées,
    // ce qui évite qu'un PATCH concurrent (ex: favoris sur un écran +
    // changement de nom sur un autre) n'écrase l'autre modification.
    const sets: string[] = [];
    const values: (string | number | null)[] = [];

    if (b.name !== undefined) { sets.push('name = ?'); values.push(b.name.trim()); }
    if (b.avatar !== undefined) { sets.push('avatar = ?'); values.push(b.avatar); }
    if (b.color !== undefined) { sets.push('color = ?'); values.push(b.color); }
    if (b.favorites !== undefined) { sets.push('favorites = ?'); values.push(JSON.stringify(b.favorites)); }
    if (b.dashboardLayout !== undefined) { sets.push('dashboard_layout = ?'); values.push(JSON.stringify(b.dashboardLayout)); }

    if (sets.length > 0) {
      values.push(req.params.id);
      db.prepare(`UPDATE profiles SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    }
    // Les pièces vivent dans leur propre table : hors du UPDATE, et seulement
    // si le client en a envoyé — sinon un PATCH de renommage les effacerait.
    if (b.roomIds !== undefined) setRooms(req.params.id, b.roomIds);

    broadcast('profiles');
    return readProfile(req.params.id);
  });

  app.delete<{ Params: { id: string } }>('/api/profiles/:id', (req, reply) => {
    // Le profil « Maison » porte tous les écrans partagés : le supprimer les
    // rendrait orphelins, et rien ne pourrait plus s'y rattacher.
    if (req.params.id === HOUSE_PROFILE_ID) {
      return reply.code(400).send({ error: 'Le profil Maison ne peut pas être supprimé' });
    }
    const result = db.prepare('DELETE FROM profiles WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return reply.code(404).send({ error: 'Profil introuvable' });
    broadcast('profiles');
    return reply.code(204).send();
  });
}
