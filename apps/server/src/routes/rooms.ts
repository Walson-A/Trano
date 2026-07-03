import type { FastifyInstance } from 'fastify';
import type { Room, RoomCreate, RoomUpdate } from '@trano/shared';
import { db, newId } from '../db.ts';
import { broadcast } from '../ws.ts';

interface RoomRow {
  id: string;
  name: string;
  floor: string;
  icon: string;
  sort_order: number;
}

function toRoom(row: RoomRow): Room {
  return {
    id: row.id,
    name: row.name,
    floor: row.floor as Room['floor'],
    icon: row.icon,
    sortOrder: row.sort_order,
  };
}

/** Id lisible dérivé du nom ("Salle de jeux" → "salle-de-jeux") */
function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return base || newId().slice(0, 8);
}

export function roomRoutes(app: FastifyInstance): void {
  app.get('/api/rooms', () => {
    const rows = db.prepare('SELECT * FROM rooms ORDER BY sort_order, name').all() as unknown as RoomRow[];
    return rows.map(toRoom);
  });

  app.post<{ Body: RoomCreate }>('/api/rooms', (req, reply) => {
    const { name, floor = 'RDC', icon = 'sofa' } = req.body ?? {};
    if (!name?.trim()) return reply.code(400).send({ error: 'Le nom est requis' });
    if (floor !== 'RDC' && floor !== 'Étage') return reply.code(400).send({ error: 'Étage inconnu' });

    let id = slugify(name);
    if (db.prepare('SELECT 1 FROM rooms WHERE id = ?').get(id)) id = `${id}-${newId().slice(0, 4)}`;

    const maxOrder = (db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS m FROM rooms').get() as { m: number }).m;
    db.prepare('INSERT INTO rooms (id, name, floor, icon, sort_order) VALUES (?, ?, ?, ?, ?)').run(
      id, name.trim(), floor, icon, maxOrder + 1
    );

    broadcast('rooms');
    const row = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) as unknown as RoomRow;
    return reply.code(201).send(toRoom(row));
  });

  app.patch<{ Params: { id: string }; Body: RoomUpdate }>('/api/rooms/:id', (req, reply) => {
    const row = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id) as unknown as RoomRow | undefined;
    if (!row) return reply.code(404).send({ error: 'Pièce introuvable' });

    const b = req.body ?? {};
    if (b.floor && b.floor !== 'RDC' && b.floor !== 'Étage') {
      return reply.code(400).send({ error: 'Étage inconnu' });
    }
    db.prepare('UPDATE rooms SET name = ?, floor = ?, icon = ?, sort_order = ? WHERE id = ?').run(
      b.name?.trim() || row.name,
      b.floor ?? row.floor,
      b.icon ?? row.icon,
      b.sortOrder ?? row.sort_order,
      req.params.id
    );

    broadcast('rooms');
    const updated = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id) as unknown as RoomRow;
    return toRoom(updated);
  });

  app.delete<{ Params: { id: string } }>('/api/rooms/:id', (req, reply) => {
    const result = db.prepare('DELETE FROM rooms WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return reply.code(404).send({ error: 'Pièce introuvable' });

    // Nettoyage des références dans les profils (pièces attitrées/favorites)
    const profiles = db.prepare('SELECT id, room_ids, favorite_rooms FROM profiles').all() as Array<{
      id: string; room_ids: string; favorite_rooms: string;
    }>;
    const clean = db.prepare('UPDATE profiles SET room_ids = ?, favorite_rooms = ? WHERE id = ?');
    for (const p of profiles) {
      const roomIds = (JSON.parse(p.room_ids) as string[]).filter((r) => r !== req.params.id);
      const favRooms = (JSON.parse(p.favorite_rooms ?? '[]') as string[]).filter((r) => r !== req.params.id);
      clean.run(JSON.stringify(roomIds), JSON.stringify(favRooms), p.id);
    }

    broadcast('rooms');
    broadcast('profiles');
    return reply.code(204).send();
  });
}
