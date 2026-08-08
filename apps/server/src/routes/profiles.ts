import type { FastifyInstance } from 'fastify';
import type { Profile, ProfileCreate, ProfileUpdate } from '@trano/shared';
import { db, newId } from '../db.ts';
import { broadcast } from '../ws.ts';

interface ProfileRow {
  id: string;
  name: string;
  avatar: string;
  color: string;
  room_ids: string;
  is_kid: number;
  favorites: string;
  favorite_rooms: string;
  dashboard_layout: string;
  created_at: string;
}

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar,
    color: row.color,
    roomIds: JSON.parse(row.room_ids),
    isKid: row.is_kid === 1,
    favorites: JSON.parse(row.favorites),
    favoriteRooms: JSON.parse(row.favorite_rooms ?? '[]'),
    dashboardLayout: JSON.parse(row.dashboard_layout ?? '[]'),
    createdAt: row.created_at,
  };
}

export function profileRoutes(app: FastifyInstance): void {
  app.get('/api/profiles', () => {
    const rows = db.prepare('SELECT * FROM profiles ORDER BY created_at').all() as unknown as ProfileRow[];
    return rows.map(toProfile);
  });

  app.post<{ Body: ProfileCreate }>('/api/profiles', (req, reply) => {
    const { name, avatar = '😀', color = '#f59e0b', roomIds = [], isKid = false } = req.body ?? {};
    if (!name?.trim()) return reply.code(400).send({ error: 'Le nom est requis' });

    const id = newId();
    db.prepare(
      'INSERT INTO profiles (id, name, avatar, color, room_ids, is_kid) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, name.trim(), avatar, color, JSON.stringify(roomIds), isKid ? 1 : 0);

    broadcast('profiles');
    const row = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id) as unknown as ProfileRow;
    return reply.code(201).send(toProfile(row));
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
    if (b.roomIds !== undefined) { sets.push('room_ids = ?'); values.push(JSON.stringify(b.roomIds)); }
    if (b.isKid !== undefined) { sets.push('is_kid = ?'); values.push(b.isKid ? 1 : 0); }
    if (b.favorites !== undefined) { sets.push('favorites = ?'); values.push(JSON.stringify(b.favorites)); }
    if (b.favoriteRooms !== undefined) { sets.push('favorite_rooms = ?'); values.push(JSON.stringify(b.favoriteRooms)); }
    if (b.dashboardLayout !== undefined) { sets.push('dashboard_layout = ?'); values.push(JSON.stringify(b.dashboardLayout)); }

    if (sets.length > 0) {
      values.push(req.params.id);
      db.prepare(`UPDATE profiles SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    }

    broadcast('profiles');
    const updated = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id) as unknown as ProfileRow;
    return toProfile(updated);
  });

  app.delete<{ Params: { id: string } }>('/api/profiles/:id', (req, reply) => {
    const result = db.prepare('DELETE FROM profiles WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return reply.code(404).send({ error: 'Profil introuvable' });
    broadcast('profiles');
    return reply.code(204).send();
  });
}
