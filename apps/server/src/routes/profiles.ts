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
    const row = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id) as unknown as
      | ProfileRow
      | undefined;
    if (!row) return reply.code(404).send({ error: 'Profil introuvable' });

    const current = toProfile(row);
    const b = req.body ?? {};
    const next = {
      name: b.name?.trim() || current.name,
      avatar: b.avatar ?? current.avatar,
      color: b.color ?? current.color,
      roomIds: b.roomIds ?? current.roomIds,
      isKid: b.isKid ?? current.isKid,
      favorites: b.favorites ?? current.favorites,
    };

    db.prepare(
      'UPDATE profiles SET name = ?, avatar = ?, color = ?, room_ids = ?, is_kid = ?, favorites = ? WHERE id = ?'
    ).run(
      next.name,
      next.avatar,
      next.color,
      JSON.stringify(next.roomIds),
      next.isKid ? 1 : 0,
      JSON.stringify(next.favorites),
      req.params.id
    );

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
