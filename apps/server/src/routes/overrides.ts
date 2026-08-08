import type { FastifyInstance } from 'fastify';
import type { DeviceOverride } from '@trano/shared';
import { db } from '../db.ts';
import { broadcast } from '../ws.ts';

interface OverrideRow {
  entity_id: string;
  display_name: string | null;
  room_id: string | null;
  hidden: number;
  position_x: number | null;
  position_y: number | null;
}

function toOverride(row: OverrideRow): DeviceOverride {
  const o: DeviceOverride = {};
  if (row.display_name != null) o.displayName = row.display_name;
  if (row.room_id != null) o.roomId = row.room_id;
  if (row.hidden) o.hidden = true;
  if (row.position_x != null && row.position_y != null) {
    o.position = { x: row.position_x, y: row.position_y };
  }
  return o;
}

export function overrideRoutes(app: FastifyInstance): void {
  /**
   * Toutes les surcharges en une requête. Le frontend les charge au
   * démarrage et les maintient synchronisées via le WebSocket.
   */
  app.get('/api/device-overrides', () => {
    const rows = db
      .prepare('SELECT * FROM device_overrides')
      .all() as unknown as OverrideRow[];
    const map: Record<string, DeviceOverride> = {};
    for (const row of rows) map[row.entity_id] = toOverride(row);
    return map;
  });

  /**
   * Créer ou mettre à jour une surcharge. UPSERT pour que le frontend
   * n'ait pas besoin de savoir si la ligne existe déjà.
   */
  app.put<{ Params: { entityId: string }; Body: DeviceOverride }>(
    '/api/device-overrides/:entityId',
    (req) => {
      const { entityId } = req.params;
      const b = req.body ?? {};

      db.prepare(`
        INSERT INTO device_overrides (entity_id, display_name, room_id, hidden, position_x, position_y)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(entity_id) DO UPDATE SET
          display_name = COALESCE(?, display_name),
          room_id      = COALESCE(?, room_id),
          hidden       = COALESCE(?, hidden),
          position_x   = COALESCE(?, position_x),
          position_y   = COALESCE(?, position_y)
      `).run(
        entityId,
        b.displayName ?? null,
        b.roomId ?? null,
        b.hidden ? 1 : 0,
        b.position?.x ?? null,
        b.position?.y ?? null,
        // ON CONFLICT values
        b.displayName ?? null,
        b.roomId ?? null,
        b.hidden !== undefined ? (b.hidden ? 1 : 0) : null,
        b.position?.x ?? null,
        b.position?.y ?? null,
      );

      broadcast('device-overrides');

      const row = db
        .prepare('SELECT * FROM device_overrides WHERE entity_id = ?')
        .get(entityId) as unknown as OverrideRow;
      return toOverride(row);
    },
  );

  /** Supprimer une surcharge (retour aux valeurs HA d'origine). */
  app.delete<{ Params: { entityId: string } }>(
    '/api/device-overrides/:entityId',
    (req, reply) => {
      const result = db
        .prepare('DELETE FROM device_overrides WHERE entity_id = ?')
        .run(req.params.entityId);
      if (result.changes === 0) {
        return reply.code(404).send({ error: 'Surcharge introuvable' });
      }
      broadcast('device-overrides');
      return reply.code(204).send();
    },
  );
}
